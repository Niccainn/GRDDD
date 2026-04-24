import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { assertCanWriteEnvironment } from '@/lib/auth/ownership';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');

  const courses = await prisma.course.findMany({
    where: {
      ...(environmentId ? { environmentId } : {}),
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      author: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { select: { id: true }, orderBy: { order: 'asc' } },
        },
      },
      enrollments: {
        where: { identityId: identity.id },
        select: { id: true, status: true, progress: true, completedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const shaped = courses.map(c => {
    const totalLessons = c.modules.reduce((n, m) => n + m.lessons.length, 0);
    const enrollment = c.enrollments[0] ?? null;
    return {
      id: c.id,
      title: c.title,
      summary: c.summary,
      coverUrl: c.coverUrl,
      published: c.published,
      skillTag: c.skillTag,
      environment: c.environment,
      author: c.author,
      totalLessons,
      totalModules: c.modules.length,
      enrollment,
      createdAt: c.createdAt.toISOString(),
    };
  });

  return Response.json({ courses: shaped });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, summary, environmentId, skillTag } = body;
  if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });
  if (!environmentId) return Response.json({ error: 'environmentId required' }, { status: 400 });

  await assertCanWriteEnvironment(environmentId, identity.id);

  const course = await prisma.course.create({
    data: {
      title: title.trim(),
      summary: summary?.trim() ?? null,
      skillTag: skillTag?.trim() ?? null,
      environmentId,
      authorId: identity.id,
    },
  });

  return Response.json({ course }, { status: 201 });
}
