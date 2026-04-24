import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: {
      id,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    select: { id: true, published: true, authorId: true },
  });
  if (!course) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!course.published && course.authorId !== identity.id) {
    return Response.json({ error: 'Course is not published' }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { identityId_courseId: { identityId: identity.id, courseId: id } },
    create: { identityId: identity.id, courseId: id },
    update: {},
  });

  return Response.json(enrollment);
}
