import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  dispatchSync,
  IMPLEMENTED_SYNC_PROVIDERS,
  type IntegrationLike,
  type SyncItem,
} from '@/lib/integrations/sync/dispatcher';
import { detectSilentSync, median } from '@/lib/integrations/sync/silent-detector';
import { logError } from '@/lib/observability/errors';

/**
 * Scheduled sync tick. Drives automatic refresh of every active
 * integration whose provider has a fetcher wired.
 *
 * Expected cadence: every 15 minutes via Vercel Cron (or whatever
 * cron you wire up — see vercel.json `crons` or external scheduler).
 * The handler itself is idempotent: if fired twice in the same
 * minute, duplicate signals are deduped against Signal.sourceRef.
 *
 * Access: protected by GRID_CRON_TOKEN (shared secret). A missing
 * env var disables the endpoint — it returns 503, no silent failure.
 *
 * Zero-cost posture: no LLM calls here. Each sync uses the tenant's
 * own OAuth credentials. Grid's marginal cost is one DB round-trip
 * per integration and one write per new item.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — Vercel limit for most plans

const MAX_INTEGRATIONS_PER_TICK = 50;

export async function GET(req: NextRequest) {
  const secret = process.env.GRID_CRON_TOKEN;
  if (!secret) {
    return Response.json(
      { error: 'Cron disabled (GRID_CRON_TOKEN unset)' },
      { status: 503 },
    );
  }

  // Auth: either Authorization: Bearer <token>, or Vercel Cron's
  // native header (x-vercel-cron=1 plus Authorization with the secret).
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate-limit the cron endpoint itself so an attacker who somehow
  // got the token can't flood. 6 calls / 15 min covers the intended
  // "every 15 min" cadence with 2x headroom for Vercel retries.
  const rl = rateLimit('cron:sync-integrations', 6, 15 * 60_000);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Fetch active integrations whose provider has a working fetcher.
  const integrations = await prisma.integration.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      provider: { in: Array.from(IMPLEMENTED_SYNC_PROVIDERS) },
      environment: { deletedAt: null },
    },
    orderBy: [{ lastSyncedAt: 'asc' }, { createdAt: 'asc' }],
    take: MAX_INTEGRATIONS_PER_TICK,
  });

  let processed = 0;
  let signalsCreated = 0;
  let failed = 0;

  for (const integration of integrations) {
    processed++;
    const since = integration.lastSyncedAt ?? new Date(Date.now() - 30 * 86_400_000);

    try {
      const result = await dispatchSync(integration as IntegrationLike, since);
      if (!result.ok) {
        failed++;
        await logError({
          scope: 'integration_sync_cron',
          environmentId: integration.environmentId,
          message: `Cron sync failed for ${integration.provider}: ${result.reason}`,
          context: { integrationId: integration.id, reason: result.reason },
        });
        continue;
      }
      const tickSignals = await persistItems(integration.environmentId, result.items);
      signalsCreated += tickSignals;
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });

      // Silent-sync detection. Runs per integration, per tick —
      // cheap because both window queries are indexed on
      // environmentId + sourceRef prefix. See
      // lib/integrations/sync/silent-detector.ts for the decision
      // rules; this block only supplies the inputs.
      await maybeEmitSilentAlert(integration, tickSignals).catch(err => {
        // Detector failures must not break the sync — log + continue.
        void logError({
          scope: 'silent_detector',
          environmentId: integration.environmentId,
          message: err instanceof Error ? err.message : 'unknown',
          context: { integrationId: integration.id },
        });
      });
    } catch (err) {
      failed++;
      await logError({
        scope: 'integration_sync_cron',
        environmentId: integration.environmentId,
        message: err instanceof Error ? err.message : 'unknown error',
        context: { integrationId: integration.id, provider: integration.provider },
      });
    }
  }

  return Response.json({
    ok: true,
    processed,
    signalsCreated,
    failed,
    tickedAt: new Date().toISOString(),
  });
}

async function persistItems(environmentId: string, items: SyncItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const sourceIds = items.map(i => i.sourceId);
  const existing = await prisma.signal.findMany({
    where: { environmentId, sourceRef: { in: sourceIds } },
    select: { sourceRef: true },
  });
  const seen = new Set(existing.map(e => e.sourceRef).filter((x): x is string => !!x));
  const toCreate = items.filter(i => !seen.has(i.sourceId));
  if (toCreate.length === 0) return 0;

  await prisma.signal.createMany({
    data: toCreate.map(item => ({
      title: item.title.slice(0, 200),
      body: item.body?.slice(0, 2000) ?? null,
      source: `integration:${itemProvider(item.sourceId)}`,
      sourceRef: item.sourceId,
      priority: item.priority ?? 'NORMAL',
      environmentId,
    })),
  });
  return toCreate.length;
}

function itemProvider(sourceId: string): string {
  const colon = sourceId.indexOf(':');
  return colon === -1 ? 'unknown' : sourceId.slice(0, colon);
}

/**
 * For a single integration, compute the 7-day volume distribution
 * and recent-tick activity, then call the pure detector. When the
 * detector fires, persist a high-visibility Nova signal so the user
 * sees "Notion has gone quiet" in their inbox instead of discovering
 * it 48h later.
 *
 * Dedupe rule: if a `silent_sync` Nova signal was already created for
 * this integration within the last 24h, skip — we don't want to
 * hammer the inbox with identical alerts on every 15-min tick while
 * the integration is still dark.
 */
async function maybeEmitSilentAlert(
  integration: { id: string; provider: string; displayName: string; environmentId: string },
  tickSignalCount: number,
): Promise<void> {
  const source = `integration:${integration.provider}`;
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 86_400_000);

  const [last7d, recent3Ticks, lastAlert] = await Promise.all([
    prisma.signal.findMany({
      where: { environmentId: integration.environmentId, source, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    // Last 3 ticks = last 45 minutes, give or take cron drift.
    prisma.signal.count({
      where: {
        environmentId: integration.environmentId,
        source,
        createdAt: { gte: new Date(now - 45 * 60_000) },
      },
    }),
    prisma.signal.findFirst({
      where: {
        environmentId: integration.environmentId,
        source: 'nova',
        sourceRef: `silent_sync:${integration.id}`,
        createdAt: { gte: new Date(now - 24 * 60 * 60_000) },
      },
      select: { id: true },
    }),
  ]);

  // Bucket the 7-day signals into day-level counts for a stable median.
  const dayBuckets = new Map<string, number>();
  for (const s of last7d) {
    const key = s.createdAt.toISOString().slice(0, 10);
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const dailyCounts = Array.from(dayBuckets.values());
  const median7d = median(dailyCounts);

  // Estimate consecutiveZeroTicks via the age of the most recent
  // signal on this integration. 15-min ticks → roughly gap / 15.
  const mostRecent = last7d
    .map(s => s.createdAt.getTime())
    .sort((a, b) => b - a)[0];
  const gapMinutes = mostRecent ? Math.floor((now - mostRecent) / 60_000) : Infinity;
  const consecutiveZeroTicks = Number.isFinite(gapMinutes) ? Math.floor(gapMinutes / 15) : 999;

  const result = detectSilentSync({
    integrationId: integration.id,
    provider: integration.provider,
    displayName: integration.displayName,
    environmentId: integration.environmentId,
    recentTickSignals: tickSignalCount > 0 ? tickSignalCount : recent3Ticks,
    median7dDailySignals: median7d,
    consecutiveZeroTicks,
    alertedWithin24h: Boolean(lastAlert),
  });

  if (!result.alert) return;

  await prisma.signal.create({
    data: {
      title: result.title,
      body: result.body,
      source: 'nova',
      sourceRef: `silent_sync:${integration.id}`,
      priority: result.severity === 'high' ? 'HIGH' : 'NORMAL',
      status: 'UNREAD',
      environmentId: result.environmentId,
    },
  });
}
