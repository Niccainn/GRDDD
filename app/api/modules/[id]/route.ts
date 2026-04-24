import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

async function assertAuthor(moduleId: string, identityId: string) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, course: { authorId: identityId } },
    select: { id: true, courseId: true },
  });
  return mod;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  if (!(await assertAuthor(id, identity.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json();
  const updated = await prisma.module.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.order !== undefined ? { order: Number(body.order) }         : {}),
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
  if (!(await assertAuthor(id, identity.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.module.delete({ where: { id } });
  return Response.json({ deleted: true });
}
