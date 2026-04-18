import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';
import { getReadableEnvironment } from '@/lib/integrations/access';
import { PROVIDERS } from '@/lib/integrations/registry';

/**
 * POST /api/integrations/[id]/repair
 *
 * Re-derives an integration's displayName + accountLabel from the
 * live provider when the stored values are obviously broken (e.g.
 * "Google Calendar · undefined" — the symptom of the missing
 * openid/email/profile scopes on Google OAuth providers, now fixed
 * in registry.ts but already-connected rows remain broken).
 *
 * This doesn't re-run OAuth. It uses the stored access token to
 * re-query the userinfo endpoint (for Google) or the equivalent
 * provider endpoint, then overwrites the label columns. If the
 * stored token doesn't have the right scopes, the only fix is
 * disconnect + reconnect — we return a clear message saying so.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const integration = await prisma.integration.findFirst({
    where: { id, deletedAt: null },
  });
  if (!integration) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await getReadableEnvironment(integration.environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const def = PROVIDERS.find(r => r.id === integration.provider);
  if (!def) return Response.json({ error: 'Provider not in registry' }, { status: 400 });

  let creds: Record<string, string>;
  try {
    creds = JSON.parse(decryptString(integration.credentialsEnc)) as Record<string, string>;
  } catch {
    return Response.json({ error: 'Could not decrypt credentials' }, { status: 500 });
  }

  // Google family — re-query userinfo. Requires openid scope on the
  // stored token; if the integration was connected before the scope
  // fix landed, this will fail with 401 or return without email and
  // we'll tell the user to reconnect.
  const isGoogle = [
    'google_calendar',
    'google_drive',
    'google_ads',
    'google_analytics',
    'google_search_console',
    'google_workspace',
  ].includes(integration.provider);

  if (!isGoogle) {
    return Response.json(
      { error: 'Repair only implemented for Google providers right now.' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!res.ok) {
      return Response.json(
        {
          error:
            'Stored token does not have openid/email scope. Disconnect and reconnect to repair.',
        },
        { status: 409 },
      );
    }
    const userInfo = (await res.json()) as { email?: string; name?: string };
    if (!userInfo.email) {
      return Response.json(
        {
          error:
            'Google returned no email — the stored token is missing the email scope. Disconnect and reconnect to repair.',
        },
        { status: 409 },
      );
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        displayName: `${def.name} · ${userInfo.email}`,
        accountLabel: userInfo.email,
      },
    });

    return Response.json({
      ok: true,
      displayName: updated.displayName,
      accountLabel: updated.accountLabel,
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : 'Repair failed',
      },
      { status: 500 },
    );
  }
}
