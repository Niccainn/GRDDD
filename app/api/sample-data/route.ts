import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE() {
  const identity = await getAuthIdentity();

  // Get all environments owned by this user
  const envIds = await prisma.environment
    .findMany({
      where: { ownerId: identity.id },
      select: { id: true },
    })
    .then((envs) => envs.map((e) => e.id));

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

  return Response.json({ cleared: true });
}
