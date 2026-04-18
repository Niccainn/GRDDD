import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import {
  dispatchSync,
  IMPLEMENTED_SYNC_PROVIDERS,
  type IntegrationLike,
  type SyncItem,
} from '@/lib/integrations/sync/dispatcher';
import { logError } from '@/lib/observability/errors';

/**
 * POST /api/integrations/[id]/sync
 *
 * Triggers a pull-sync for a connected integration. This used to be
 * a stub that wrote one "sync triggered" signal and returned success.
 * Now it calls the provider's real fetcher via the dispatcher, dedupes
 * against existing signals (so re-runs don't flood), and persists
 * each new item as a Signal for Nova to triage.
 *
 * Zero-cost posture: the sync runs use the tenant's own credentials
 * (their OAuth token or API key, which they paid for separately).
 * Grid's marginal cost per sync is one DB write per new item.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const integration = await prisma.integration.findFirst({
    where: {
      id,
      status: 'ACTIVE',
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
  });

  if (!integration) {
    return Response.json({ error: 'Integration not found' }, { status: 404 });
  }

  // Short-circuit: if this provider doesn't have a real fetcher yet,
  // tell the caller honestly rather than silently pretending success.
  if (!IMPLEMENTED_SYNC_PROVIDERS.has(integration.provider)) {
    return Response.json({
      synced: false,
      reason: 'provider_not_implemented',
      provider: integration.provider,
    });
  }

  const since = integration.lastSyncedAt ?? new Date(Date.now() - 30 * 86_400_000);

  const result = await dispatchSync(integration as IntegrationLike, since);

  if (!result.ok) {
    await logError({
      scope: 'integration_sync',
      environmentId: integration.environmentId,
      message: `Sync failed for ${integration.provider}: ${result.reason}`,
      context: { integrationId: id, reason: result.reason },
    });
    return Response.json(
      { synced: false, reason: result.reason, provider: result.provider },
      { status: 502 },
    );
  }

  // De-dupe against existing signals for this integration so re-runs
  // don't spam the inbox. We scope by sourceRef which carries the
  // provider-native ID (notion:page_xxx, slack:channel:ts, etc.).
  const signalsCreated = await persistSyncItems(integration.environmentId, result.items);

  await prisma.integration.update({
    where: { id },
    data: { lastSyncedAt: new Date() },
  });

  return Response.json({
    synced: true,
    provider: integration.provider,
    itemsFetched: result.items.length,
    signalsCreated,
    since: since.toISOString(),
    syncedAt: new Date().toISOString(),
  });
}

async function persistSyncItems(environmentId: string, items: SyncItem[]): Promise<number> {
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
    // @prisma/client in Postgres supports skipDuplicates; SQLite does not
    // — if we're on SQLite locally the sourceRef dedupe above covers it.
  });
  return toCreate.length;
}

function itemProvider(sourceId: string): string {
  const colon = sourceId.indexOf(':');
  return colon === -1 ? 'unknown' : sourceId.slice(0, colon);
}
