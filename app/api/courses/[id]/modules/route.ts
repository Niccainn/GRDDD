import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

async function assertAuthor(courseId: string, identityId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId: identityId },
    select: { id: true },
  });
  return !!course;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  if (!(await assertAuthor(id, identity.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json();
  if (!body.title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });

  const existing = await prisma.module.count({ where: { courseId: id } });
  const mod = await prisma.module.create({
    data: {
      title: String(body.title).trim(),
      order: existing,
      courseId: id,
    },
  });
  return Response.json(mod, { status: 201 });
}
