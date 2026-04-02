import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(body.title !== undefined     ? { title: body.title.trim() }         : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.metric !== undefined    ? { metric: body.metric || null }       : {}),
      ...(body.target !== undefined    ? { target: body.target || null }       : {}),
      ...(body.current !== undefined   ? { current: body.current || null }     : {}),
      ...(body.status !== undefined    ? { status: body.status }               : {}),
      ...(body.progress !== undefined  ? { progress: body.progress }           : {}),
      ...(body.dueDate !== undefined   ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
    },
    include: { system: { select: { id: true, name: true, color: true } } },
  });

  return Response.json({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    target: goal.target,
    current: goal.current,
    status: goal.status,
    progress: goal.progress,
    dueDate: goal.dueDate?.toISOString() ?? null,
    systemId: goal.systemId,
    system: goal.system,
    updatedAt: goal.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.goal.delete({ where: { id } });
  return Response.json({ deleted: true });
}
