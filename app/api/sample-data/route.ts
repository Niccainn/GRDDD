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

  // Also clean up any demo-seeded data from initial testing
  await prisma.task.deleteMany({
    where: {
      environmentId: { in: envIds },
      labels: { contains: 'demo' },
    },
  });

  return Response.json({ cleared: true });
}
