import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { workflowId, systemId, input, withStages } = await req.json();
  if (!systemId || !input) {
    return Response.json({ error: 'Missing systemId or input' }, { status: 400 });
  }

  const execution = await prisma.execution.create({
    data: {
      status: withStages ? 'RUNNING' : 'COMPLETED',
      input,
      systemId,
      currentStage: withStages ? 0 : null,
      ...(workflowId ? { workflowId } : {}),
    },
  });

  await prisma.systemState.upsert({
    where: { systemId },
    update: { lastActivity: new Date() },
    create: { systemId, lastActivity: new Date() },
  });

  // Audit
  const [system, workflow] = await Promise.all([
    prisma.system.findUnique({ where: { id: systemId }, select: { name: true, environmentId: true } }),
    workflowId ? prisma.workflow.findUnique({ where: { id: workflowId }, select: { name: true } }) : null,
  ]);
  audit({
    action: 'execution.started',
    entity: 'Execution',
    entityId: execution.id,
    entityName: workflow?.name ?? system?.name ?? 'Execution',
    metadata: { systemId, workflowId: workflowId ?? null, input: input.slice(0, 200) },
    environmentId: system?.environmentId,
  });

  return Response.json(execution);
}
