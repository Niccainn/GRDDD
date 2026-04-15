import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsExecution } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsExecution(id, identity.id);
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      system: { include: { environment: true } },
      workflow: true,
      validationResult: true,
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
    validation: execution.validationResult ? {
      score: execution.validationResult.score,
      issues: JSON.parse(execution.validationResult.issues ?? '[]'),
      summary: execution.validationResult.correctedOutput,
    } : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsExecution(id, identity.id);
  const body = await req.json();

  const updated = await prisma.execution.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.currentStage !== undefined && { currentStage: body.currentStage }),
      ...(body.output !== undefined && { output: body.output }),
      ...(body.status === 'COMPLETED' && { completedAt: new Date() }),
    },
    include: {
      system: { select: { id: true, name: true } },
      workflow: { select: { name: true } },
    },
  });

  // Notify on completion or failure
  if (body.status === 'COMPLETED' || body.status === 'FAILED') {
    const isFailure = body.status === 'FAILED';
    const label = updated.workflow?.name ?? updated.system?.name ?? 'Execution';
    createNotification({
      identityId: identity.id,
      type: isFailure ? 'execution_failed' : 'execution_complete',
      title: isFailure ? `Execution failed` : `Execution completed`,
      body: isFailure
        ? `${label} encountered an error`
        : `${label} finished successfully`,
      href: `/systems/${updated.system?.id ?? updated.systemId}`,
    }).catch(() => {});
  }

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsExecution(id, identity.id);
  await prisma.execution.delete({ where: { id } });
  return Response.json({ deleted: true });
}
