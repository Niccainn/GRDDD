/**
 * Shared authorization helper for the /api/integrations/* routes.
 * Mirrors the pattern from the BYOK Anthropic-key endpoint: the
 * caller must either own the environment or hold an ADMIN membership.
 * CONTRIBUTORs and VIEWERs cannot connect or disconnect third-party
 * credentials because that's effectively a billing/security change.
 *
 * Returns null on any miss so callers can respond with a generic 404
 * rather than leaking whether the environment exists or not.
 */

import { prisma } from '@/lib/db';

export async function getAdministrableEnvironment(environmentId: string, identityId: string) {
  return prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId, role: 'ADMIN' } } },
      ],
    },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
}

/**
 * Broader access — lets VIEWERs and CONTRIBUTORs see the list of
 * connected integrations in their environment without being able
 * to mutate them. Used by GET /api/integrations.
 */
export async function getReadableEnvironment(environmentId: string, identityId: string) {
  return prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId } } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
}

/**
 * List the environments the caller can see, ordered owned-first so
 * the UI can default-select the most likely one.
 */
export async function listAccessibleEnvironments(identityId: string) {
  const [owned, memberOf] = await Promise.all([
    prisma.environment.findMany({
      where: { ownerId: identityId, deletedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.environment.findMany({
      where: {
        deletedAt: null,
        memberships: { some: { identityId } },
        ownerId: { not: identityId },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return [...owned, ...memberOf];
}
