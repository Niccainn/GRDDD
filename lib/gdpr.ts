import { prisma } from './db';

/**
 * Export all user data for GDPR Subject Access Request.
 */
export async function exportUserData(identityId: string) {
  const [identity, memberships, systems, workflows, goals, apiKeys, logs] =
    await Promise.all([
      prisma.identity.findUnique({
        where: { id: identityId },
        select: {
          id: true, name: true, email: true, type: true, avatar: true,
          description: true, createdAt: true,
        },
      }),
      prisma.environmentMembership.findMany({
        where: { identityId },
        include: { environment: { select: { name: true, slug: true } } },
      }),
      prisma.system.findMany({
        where: { creatorId: identityId },
        select: { id: true, name: true, createdAt: true, environmentId: true },
      }),
      prisma.workflow.findMany({
        where: { creatorId: identityId },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.goal.findMany({
        where: { creatorId: identityId },
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      prisma.apiKey.findMany({
        where: { identityId },
        select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsed: true },
      }),
      prisma.intelligenceLog.findMany({
        where: { identityId },
        select: { id: true, action: true, tokens: true, cost: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    identity,
    memberships: memberships.map(m => ({
      role: m.role,
      environment: m.environment.name,
      slug: m.environment.slug,
    })),
    createdSystems: systems,
    createdWorkflows: workflows,
    goals,
    apiKeys,
    intelligenceLogs: logs,
  };
}

/**
 * GDPR Right to Erasure — soft-delete + anonymize.
 */
export async function eraseUserData(identityId: string) {
  await prisma.$transaction([
    // Anonymize identity
    prisma.identity.update({
      where: { id: identityId },
      data: {
        name: '[Deleted User]',
        email: null,
        avatar: null,
        description: null,
        metadata: null,
        deletedAt: new Date(),
      },
    }),
    // Remove memberships
    prisma.environmentMembership.deleteMany({
      where: { identityId },
    }),
    // Deactivate API keys
    prisma.apiKey.updateMany({
      where: { identityId },
      data: { isActive: false },
    }),
    // Nullify identity on intelligence logs (keep logs for audit)
    prisma.intelligenceLog.updateMany({
      where: { identityId },
      data: { identityId: null },
    }),
  ]);
}

/**
 * Purge old intelligence logs (data retention).
 */
export async function purgeOldLogs(retentionDays: number = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await prisma.intelligenceLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}
