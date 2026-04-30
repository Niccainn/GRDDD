/**
 * GET /api/upcoming — "About to do" lane on /dashboard.
 *
 * Pillar 1 of the cognition-platform framing: the home page is a
 * verb, not a list. The three lanes — about to do · just did ·
 * needs you for — depend on this endpoint surfacing the first.
 *
 * Phase A scope (this endpoint): active scheduled Automations the
 * caller owns. Future phases will add due Tasks, pending Approvals,
 * scheduled Workflow runs, and at-risk Goals.
 *
 * Tenant scope: identityId match AND environment.ownerId match,
 * mirroring the /api/automations defense for stale rows.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function GET(_req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Active scheduled automations the caller owns. Excludes manual /
  // webhook / event triggers — only schedules belong on the
  // "about to do" lane because only they have a deterministic next
  // run without external input.
  const scheduled = await prisma.automation.findMany({
    where: {
      identityId: identity.id,
      environment: { ownerId: identity.id, deletedAt: null },
      isActive: true,
      trigger: 'schedule',
    },
    include: {
      environment: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ lastRunAt: 'asc' }, { updatedAt: 'desc' }],
    take: 10,
  });

  return Response.json({
    automations: scheduled.map(a => ({
      id: a.id,
      name: a.name,
      trigger: a.trigger,
      // The triggerConfig blob is opaque JSON; the caller can render
      // a human-friendly summary if it can parse it. We don't try to
      // compute the literal next-run time on the server because cron
      // resolution lives in the runner, not here.
      triggerConfig: a.triggerConfig,
      runCount: a.runCount,
      lastRunAt: a.lastRunAt?.toISOString() ?? null,
      environmentName: a.environment.name,
      environmentSlug: a.environment.slug,
    })),
  });
}
