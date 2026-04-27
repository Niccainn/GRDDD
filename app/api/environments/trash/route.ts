/**
 * GET /api/environments/trash
 *
 * Returns the soft-deleted environments owned by the authenticated
 * user, ordered by most-recently-trashed first. Powers the
 * /environments/trash page where users can restore or hard-purge.
 *
 * Notion / Monday convention: trashed envs auto-purge after 30 days.
 * The auto-purge cron lives at /api/cron/trash-cleanup (separate);
 * this endpoint just lists what's currently in the trash bucket.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PURGE_AFTER_DAYS = 30;

export async function GET(_req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const envs = await prisma.environment.findMany({
    where: {
      ownerId: identity.id,
      deletedAt: { not: null },
    },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      deletedAt: true,
    },
  });

  // Compute days-until-auto-purge for each so the UI can warn the
  // user before their data evaporates. 30 days from deletedAt.
  const now = Date.now();
  const enriched = envs.map(e => {
    const deletedAtMs = e.deletedAt!.getTime();
    const purgeAtMs = deletedAtMs + PURGE_AFTER_DAYS * 86_400_000;
    const daysLeft = Math.max(0, Math.ceil((purgeAtMs - now) / 86_400_000));
    return {
      ...e,
      deletedAt: e.deletedAt!.toISOString(),
      autoPurgeAt: new Date(purgeAtMs).toISOString(),
      daysUntilAutoPurge: daysLeft,
    };
  });

  return Response.json({ environments: enriched, purgeAfterDays: PURGE_AFTER_DAYS });
}
