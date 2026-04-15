import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsSignal, assertOwnsSystem, assertOwnsWorkflow } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsSignal(id, identity.id);
  const body = await req.json();
  if (body.systemId !== undefined && body.systemId !== null) {
    await assertOwnsSystem(body.systemId, identity.id);
  }
  if (body.workflowId !== undefined && body.workflowId !== null) {
    await assertOwnsWorkflow(body.workflowId, identity.id);
  }

  const signal = await prisma.signal.update({
    where: { id },
    data: {
      ...(body.status !== undefined   ? { status: body.status }     : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.systemId !== undefined ? { systemId: body.systemId } : {}),
      ...(body.workflowId !== undefined ? { workflowId: body.workflowId } : {}),
      ...(body.novaTriaged !== undefined ? { novaTriaged: body.novaTriaged } : {}),
      ...(body.novaRouting !== undefined ? { novaRouting: JSON.stringify(body.novaRouting) } : {}),
    },
    include: {
      system: { select: { id: true, name: true, color: true } },
      workflow: { select: { id: true, name: true } },
    },
  });

  return Response.json({
    id: signal.id,
    title: signal.title,
    status: signal.status,
    priority: signal.priority,
    systemId: signal.systemId,
    system: signal.system,
    workflowId: signal.workflowId,
    workflow: signal.workflow,
    novaTriaged: signal.novaTriaged,
    updatedAt: signal.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsSignal(id, identity.id);
  await prisma.signal.delete({ where: { id } });
  return Response.json({ deleted: true });
}
