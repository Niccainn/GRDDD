import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { trackUsage } from '@/lib/billing/usage';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const input = body.input ?? '';

  // Verify workflow exists and user has access
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { environment: true, system: true },
  });

  if (!workflow || workflow.deletedAt) {
    return Response.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Check access
  const hasAccess = await prisma.environment.findFirst({
    where: {
      id: workflow.environmentId,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!hasAccess) return Response.json({ error: 'Not authorized' }, { status: 403 });

  const stages = JSON.parse(workflow.stages ?? '[]');
  const withStages = stages.length > 0;

  // Create execution
  const execution = await prisma.execution.create({
    data: {
      status: withStages ? 'RUNNING' : 'COMPLETED',
      input: input || `Manual run: ${workflow.name}`,
      systemId: workflow.systemId,
      workflowId: workflow.id,
      currentStage: withStages ? 0 : null,
    },
  });

  // Update system activity
  await prisma.systemState.upsert({
    where: { systemId: workflow.systemId },
    update: { lastActivity: new Date() },
    create: { systemId: workflow.systemId, lastActivity: new Date() },
  });

  // Audit
  audit({
    action: 'execution.started',
    entity: 'Execution',
    entityId: execution.id,
    entityName: workflow.name,
    metadata: { systemId: workflow.systemId, workflowId: id, input: (input || '').slice(0, 200) },
    environmentId: workflow.environmentId,
  });

  // Track billing usage
  trackUsage(identity.id, 'executions').catch(() => {});

  return Response.json({
    id: execution.id,
    status: execution.status,
    input: execution.input,
    output: execution.output,
    currentStage: execution.currentStage,
    createdAt: execution.createdAt.toISOString(),
    stages: stages.length,
  }, { status: 201 });
}
