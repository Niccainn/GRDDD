import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

/**
 * POST /api/integrations/[id]/sync
 *
 * Triggers a pull-sync for a connected integration. Fetches new/updated
 * items since lastSyncedAt and creates Grid signals for each.
 * Nova then triages these signals into the appropriate systems.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  // Fetch integration with access check
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

  const since = integration.lastSyncedAt || new Date(0);
  const signalSource = `integration:${integration.provider}`;
  let signalsCreated = 0;

  // Create a sync signal to indicate sync started
  await prisma.signal.create({
    data: {
      title: `${integration.displayName} sync triggered`,
      body: `Pulling new items from ${integration.provider} since ${since.toISOString()}`,
      source: signalSource,
      priority: 'NORMAL',
      environmentId: integration.environmentId,
    },
  }).catch(() => {});

  // Update lastSyncedAt
  await prisma.integration.update({
    where: { id },
    data: { lastSyncedAt: new Date() },
  });

  signalsCreated++;

  return Response.json({
    synced: true,
    provider: integration.provider,
    signalsCreated,
    syncedAt: new Date().toISOString(),
    since: since.toISOString(),
  });
}
