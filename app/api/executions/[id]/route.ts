import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      system: { include: { environment: true } },
      workflow: true,
    },
  });
  if (!execution) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({
    id: execution.id,
    status: execution.status,
    input: execution.input,
    output: execution.output,
    currentStage: execution.currentStage,
    createdAt: execution.createdAt.toISOString(),
    completedAt: execution.completedAt?.toISOString() ?? null,
    system: { id: execution.system.id, name: execution.system.name, environmentName: execution.system.environment.name },
    workflow: execution.workflow ? { id: execution.workflow.id, name: execution.workflow.name, stages: JSON.parse(execution.workflow.stages ?? '[]') } : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.execution.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.currentStage !== undefined && { currentStage: body.currentStage }),
      ...(body.output !== undefined && { output: body.output }),
      ...(body.status === 'COMPLETED' && { completedAt: new Date() }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.execution.delete({ where: { id } });
  return Response.json({ deleted: true });
}
