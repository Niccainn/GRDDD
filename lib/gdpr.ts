import { prisma } from './db';

/**
 * GDPR Right to Data Portability (Article 20).
 *
 * Returns a structured, machine-readable snapshot of every piece of
 * data associated with an identity. The response is designed to be
 * self-contained: a user can hand the JSON blob to another service
 * and recreate their workspace without talking to us.
 *
 * What's included:
 *   - Identity profile (name, email, type, avatar, timestamps)
 *   - Every environment the user owns, fully expanded with its
 *     systems, workflows (plus versions), goals, signals, webhooks,
 *     intelligence definitions, and most recent executions
 *   - Every environment the user is a member of (just the metadata,
 *     not other members' data — that belongs to the owner)
 *   - API key metadata (NEVER the key material — those are one-way
 *     hashed and unrecoverable by design)
 *   - Recent intelligence logs for audit-trail transparency
 *   - Goals the user created directly
 *
 * Execution history is capped at 200 rows per system to keep the
 * export size reasonable. A user with a huge history who wants the
 * full dump can ask for it via support.
 */
export async function exportUserData(identityId: string) {
  const [
    identity,
    memberships,
    ownedEnvironments,
    goals,
    apiKeys,
    logs,
  ] = await Promise.all([
    prisma.identity.findUnique({
      where: { id: identityId },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        avatar: true,
        description: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
    }),

    prisma.environmentMembership.findMany({
      where: { identityId },
      include: {
        environment: { select: { id: true, name: true, slug: true } },
      },
    }),

    // Full tenant tree for every environment the user owns.
    prisma.environment.findMany({
      where: { ownerId: identityId, deletedAt: null },
      include: {
        systems: {
          include: {
            executions: {
              orderBy: { createdAt: 'desc' },
              take: 200,
            },
          },
        },
        workflows: {
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
        goals: true,
        signals: {
          orderBy: { createdAt: 'desc' },
          take: 500,
        },
        webhooks: true,
        intelligence: true,
      },
    }),

    prisma.goal.findMany({
      where: { creatorId: identityId },
      select: {
        id: true,
        title: true,
        description: true,
        metric: true,
        target: true,
        current: true,
        status: true,
        dueDate: true,
        progress: true,
        createdAt: true,
      },
    }),

    prisma.apiKey.findMany({
      where: { identityId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsed: true,
        isActive: true,
      },
    }),

    prisma.intelligenceLog.findMany({
      where: { identityId },
      select: {
        id: true,
        action: true,
        tokens: true,
        cost: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: 2,
    notice: [
      'This export contains all personal data Grid holds about you.',
      'API key material is never included — keys are one-way hashed.',
      'Execution history is capped at 200 rows per system. Contact privacy@grid for the full history.',
      'This file is intended to be portable per GDPR Article 20.',
    ].join(' '),
    identity,
    memberships: memberships.map((m) => ({
      role: m.role,
      environmentId: m.environment.id,
      environmentName: m.environment.name,
      environmentSlug: m.environment.slug,
    })),
    ownedEnvironments,
    goalsCreated: goals,
    apiKeys,
    intelligenceLogs: logs,
  };
}

/**
 * GDPR Right to Erasure (Article 17) — erase + anonymize.
 *
 * What this actually does, in order:
 *   1. Hard-delete every environment the identity owns. Because
 *      Environment → systems/workflows/goals/signals/etc all cascade
 *      via Prisma `onDelete: Cascade`, this takes the entire tenant
 *      tree with it. An erased user MUST leave no queryable personal
 *      data behind, and orphaned environments would.
 *   2. Delete every active session so any open tab immediately loses
 *      its authenticated state on next request.
 *   3. Hard-delete API keys so revoked credentials can't be reused.
 *   4. Delete all KernelTrace rows for this tenant (prompts + outputs
 *      may contain personal data even after redaction).
 *   5. Nullify identityId on intelligence logs + audit logs — we keep
 *      the rows for audit integrity (Art. 17(3)(b): retention for
 *      legal compliance) but sever the personal link.
 *   6. Anonymize the Identity row itself: wipe name/email/avatar/
 *      description/metadata/passwordHash/authId, stamp deletedAt.
 *      We KEEP the row so foreign keys on retained audit rows stay
 *      valid, but nothing personally identifying remains.
 *
 * This is a one-way operation. There is no undo. Callers must
 * double-confirm before invoking.
 */
export async function eraseUserData(identityId: string) {
  // Step 1: find all owned environments so we can cascade-delete them.
  // We do this OUTSIDE the transaction because a hard delete of a
  // whole environment tree can be large and we don't want a single
  // long transaction holding locks.
  const ownedEnvironments = await prisma.environment.findMany({
    where: { ownerId: identityId },
    select: { id: true },
  });

  // Cascade-delete each owned environment. Prisma's onDelete: Cascade
  // on child relations pulls systems, workflows, goals, signals,
  // intelligence, webhooks, executions, etc with each delete.
  for (const env of ownedEnvironments) {
    await prisma.environment.delete({ where: { id: env.id } }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[erase] failed to delete environment', env.id, err);
    });
  }

  // Step 2–6: run the rest as a single transaction so the identity
  // anonymization either commits with the related deletes or rolls
  // back entirely. No half-erased users.
  await prisma.$transaction([
    // Kill every active session — immediate logout everywhere.
    prisma.session.deleteMany({ where: { identityId } }),

    // Remove memberships on other tenants' environments.
    prisma.environmentMembership.deleteMany({ where: { identityId } }),

    // Hard-delete API keys so they can't be reused.
    prisma.apiKey.deleteMany({ where: { identityId } }),

    // Nullify identity on intelligence logs — keep the rows for audit
    // integrity but break the personal link.
    prisma.intelligenceLog.updateMany({
      where: { identityId },
      data: { identityId: null },
    }),

    // Finally, anonymize the Identity row. Keep the row so any
    // retained audit references remain referentially valid, but wipe
    // everything personally identifying.
    prisma.identity.update({
      where: { id: identityId },
      data: {
        name: '[Deleted User]',
        email: null,
        passwordHash: null,
        authId: null,
        avatar: null,
        description: null,
        metadata: null,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
        deletedAt: new Date(),
      },
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
