import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const systemId = searchParams.get('systemId') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(systemId ? { systemId } : {}),
      },
      include: {
        system: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
        validationResult: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.execution.count({
      where: {
        ...(status ? { status } : {}),
        ...(systemId ? { systemId } : {}),
      },
    }),
  ]);

  return Response.json({
    executions: executions.map(e => ({
      id: e.id,
      status: e.status,
      input: e.input?.slice(0, 120) ?? '',
      currentStage: e.currentStage,
      createdAt: e.createdAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      system: e.system,
      workflow: e.workflow,
      validationScore: e.validationResult?.score ?? null,
    })),
    total,
  });
}

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
