import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  dispatchSync,
  IMPLEMENTED_SYNC_PROVIDERS,
  type IntegrationLike,
  type SyncItem,
} from '@/lib/integrations/sync/dispatcher';
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
      signalsCreated += await persistItems(integration.environmentId, result.items);
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
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
