import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const mod = await prisma.module.findFirst({
    where: { id, course: { authorId: identity.id } },
    select: { id: true },
  });
  if (!mod) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (!body.title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });

  const existing = await prisma.lesson.count({ where: { moduleId: id } });
  const lesson = await prisma.lesson.create({
    data: {
      title: String(body.title).trim(),
      body: body.body ?? '',
      videoUrl: body.videoUrl?.trim() || null,
      estimatedMinutes: body.estimatedMinutes ?? null,
      order: existing,
      moduleId: id,
    },
  });
  return Response.json(lesson, { status: 201 });
}
