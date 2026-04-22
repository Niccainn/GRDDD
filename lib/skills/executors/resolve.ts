/**
 * Shared integration resolver for skill executors.
 *
 * Every executor starts with the same question: "does this
 * Environment have an active integration for Provider X?" If yes,
 * return the Integration row so the provider-specific client can
 * take it from there. If no, return null and the executor falls
 * back to its simulated-mode behaviour (or a graceful error).
 *
 * Central helper so we don't repeat the where-clause (deletedAt,
 * status) and so every executor respects the same activation rules.
 */

import { prisma } from '@/lib/db';

export type ResolvedIntegration = {
  id: string;
  provider: string;
  environmentId: string;
  status: string;
  accountLabel: string | null;
};

export async function resolveIntegration(
  environmentId: string,
  provider: string,
): Promise<ResolvedIntegration | null> {
  // credentialsEnc is a non-null String in the schema, so an ACTIVE
  // row with deletedAt=null is guaranteed to have credentials — no
  // explicit `credentialsEnc: { not: null }` filter needed (and it
  // would fail Prisma validation on a non-nullable column).
  const row = await prisma.integration.findFirst({
    where: {
      environmentId,
      provider,
      deletedAt: null,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      environmentId: true,
      status: true,
      accountLabel: true,
    },
  });
  return row;
}
