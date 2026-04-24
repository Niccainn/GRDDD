import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

async function loadAccessible(id: string, identityId: string) {
  return prisma.course.findFirst({
    where: {
      id,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      author: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
            },
          },
        },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const course = await loadAccessible(id, identity.id);
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { identityId_courseId: { identityId: identity.id, courseId: id } },
    include: { completions: { select: { lessonId: true, quizScore: true, completedAt: true } } },
  });

  return Response.json({ course, enrollment });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  const course = await loadAccessible(id, identity.id);
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 });
  if (course.authorId !== identity.id) {
    return Response.json({ error: 'Only the author can edit' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(body.title !== undefined     ? { title: String(body.title).trim() }       : {}),
      ...(body.summary !== undefined   ? { summary: body.summary || null }           : {}),
      ...(body.coverUrl !== undefined  ? { coverUrl: body.coverUrl || null }         : {}),
      ...(body.skillTag !== undefined  ? { skillTag: body.skillTag || null }         : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) }      : {}),
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
  const course = await loadAccessible(id, identity.id);
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 });
  if (course.authorId !== identity.id) {
    return Response.json({ error: 'Only the author can delete' }, { status: 403 });
  }
  await prisma.course.delete({ where: { id } });
  return Response.json({ deleted: true });
}
