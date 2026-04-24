import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE() {
  const identity = await getAuthIdentity();

  // Get all environments the user owns or has membership in
  const ownedEnvIds = await prisma.environment
    .findMany({
      where: { ownerId: identity.id },
      select: { id: true },
    })
    .then((envs) => envs.map((e) => e.id));

  const memberEnvIds = await prisma.environmentMembership
    .findMany({
      where: { identityId: identity.id },
      select: { environmentId: true },
    })
    .then((ms) => ms.map((m) => m.environmentId));

  const envIds = [...new Set([...ownedEnvIds, ...memberEnvIds])];

  if (envIds.length === 0) {
    return Response.json({ cleared: true });
  }

  // Delete sample tasks (those with 'sample' in labels — includes subtasks)
  await prisma.task.deleteMany({
    where: {
      environmentId: { in: envIds },
      labels: { contains: 'sample' },
    },
  });

  // Delete sample goals
  await prisma.goal.deleteMany({
    where: {
      environmentId: { in: envIds },
      description: { startsWith: '[Sample]' },
    },
  });

  // Delete sample workflows (and their executions cascade)
  await prisma.workflow.deleteMany({
    where: {
      environmentId: { in: envIds },
      description: { startsWith: '[Sample]' },
    },
  });

  // Signals (source === 'sample' is the tag we apply at seed time)
  await prisma.signal.deleteMany({
    where: { environmentId: { in: envIds }, source: 'sample' },
  });

  // Meetings (title prefix is stable; description starts with [Sample]).
  // ActionItem + LessonCompletion cascades fire via FK ON DELETE CASCADE.
  await prisma.meeting.deleteMany({
    where: {
      environmentId: { in: envIds },
      OR: [
        { title: { startsWith: 'Sample ·' } },
        { description: { startsWith: '[Sample]' } },
      ],
    },
  });

  // Courses — title prefix tag. Modules / lessons / enrollments / quizzes
  // cascade via FK ON DELETE CASCADE.
  await prisma.course.deleteMany({
    where: {
      environmentId: { in: envIds },
      title: { startsWith: 'Sample ·' },
    },
  });

  // Also clean up any demo-seeded data from initial testing
  await prisma.task.deleteMany({
    where: {
      environmentId: { in: envIds },
      labels: { contains: 'demo' },
    },
  });

  return Response.json({ cleared: true });
}
