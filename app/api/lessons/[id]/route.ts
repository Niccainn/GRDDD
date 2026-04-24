import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id, module: { course: { authorId: identity.id } } },
    select: { id: true },
  });
  if (!lesson) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.lesson.update({
    where: { id },
    data: {
      ...(body.title !== undefined            ? { title: String(body.title).trim() }        : {}),
      ...(body.body !== undefined             ? { body: String(body.body) }                  : {}),
      ...(body.videoUrl !== undefined         ? { videoUrl: body.videoUrl || null }          : {}),
      ...(body.estimatedMinutes !== undefined ? { estimatedMinutes: body.estimatedMinutes ?? null } : {}),
      ...(body.order !== undefined            ? { order: Number(body.order) }                : {}),
    },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id, module: { course: { authorId: identity.id } } },
    select: { id: true },
  });
  if (!lesson) return Response.json({ error: 'Not found' }, { status: 404 });
  await prisma.lesson.delete({ where: { id } });
  return Response.json({ deleted: true });
}
