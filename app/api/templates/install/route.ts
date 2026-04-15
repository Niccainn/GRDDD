import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getTemplate } from '@/lib/templates/registry';
import { audit } from '@/lib/audit';
import { NextRequest } from 'next/server';

/**
 * POST /api/templates/install — install a template into an environment.
 * Creates a System + its Workflows (with stages) in one transaction.
 *
 * Body: { templateId: string, environmentId: string }
 */
export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { templateId, environmentId } = await req.json();

  if (!templateId || !environmentId) {
    return Response.json({ error: 'templateId and environmentId are required' }, { status: 400 });
  }

  const template = getTemplate(templateId);
  if (!template) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  // Create system + workflows in a transaction
  const system = await prisma.$transaction(async (tx) => {
    const sys = await tx.system.create({
      data: {
        name: template.name,
        description: template.description,
        color: template.color,
        icon: template.icon,
        environmentId,
        creatorId: identity.id,
        healthScore: 100,
      },
    });

    for (const wf of template.workflows) {
      await tx.workflow.create({
        data: {
          name: wf.name,
          description: wf.description,
          status: wf.status ?? 'ACTIVE',
          stages: JSON.stringify(wf.stages),
          systemId: sys.id,
          environmentId,
          creatorId: identity.id,
        },
      });
    }

    return sys;
  });

  audit({
    action: 'system.created',
    entity: 'system',
    entityId: system.id,
    entityName: system.name,
    actorId: identity.id,
    actorName: identity.name,
    environmentId,
    environmentName: env.name,
    metadata: { source: 'template', templateId },
  });

  return Response.json({
    systemId: system.id,
    name: system.name,
    workflowCount: template.workflows.length,
  });
}
