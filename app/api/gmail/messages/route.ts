/**
 * GET /api/gmail/messages?limit=20
 *
 * Recent Gmail messages from the user's connected Google Workspace
 * integration. Returns the primary inbox, deprioritized of
 * promotions + social (same filter Gmail uses in its main tab).
 *
 * Response shape:
 *   { connected: boolean, account: string | null, messages: Message[] }
 *
 * If the user has no active google_workspace integration, returns
 * `{ connected: false, account: null, messages: [] }` with a 200.
 * The UI uses that signal to show a "Connect Gmail" prompt in-line
 * instead of erroring.
 */
import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getGoogleWorkspaceClient } from '@/lib/integrations/clients/google-workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 1),
    50,
  );

  // Pick the first active google_workspace integration across the
  // user's environments. Most users have one; multi-account support
  // comes later (filter by envId query param).
  const integration = await prisma.integration.findFirst({
    where: {
      environment: { ownerId: identity.id, deletedAt: null },
      provider: 'google_workspace',
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      environmentId: true,
      accountLabel: true,
      displayName: true,
    },
    orderBy: { lastSyncedAt: 'desc' },
  });

  if (!integration) {
    return Response.json({
      connected: false,
      account: null,
      messages: [],
    });
  }

  try {
    const client = await getGoogleWorkspaceClient(
      integration.id,
      integration.environmentId,
    );
    const messages = await client.listRecentMessages(limit);
    return Response.json({
      connected: true,
      account: integration.accountLabel || integration.displayName,
      messages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gmail fetch failed';
    return Response.json(
      { connected: true, account: integration.accountLabel, messages: [], error: message },
      { status: 200 },
    );
  }
}
