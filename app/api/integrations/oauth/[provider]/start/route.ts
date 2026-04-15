/**
 * GET /api/integrations/oauth/[provider]/start?environmentId=...
 *
 * Kicks off the OAuth dance for a provider. We:
 *   1. Verify the caller can administer the target environment.
 *   2. Generate a random `state` value, HMAC-bound to the
 *      environmentId, and store it in an HttpOnly short-lived cookie
 *      so the callback can verify the request came from us.
 *   3. Redirect to the provider's authorize URL.
 *
 * The callback handler reads the cookie, confirms the state matches,
 * reads environmentId from the cookie payload (NOT from URL params
 * on the callback — that would let an attacker redirect the token
 * to a different environment).
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { findProvider } from '@/lib/integrations/registry';
import { getAdministrableEnvironment } from '@/lib/integrations/access';
import { buildAuthorizeUrl, generateState } from '@/lib/integrations/oauth/base';
import { META_PROVIDER } from '@/lib/integrations/oauth/meta';
import {
  GOOGLE_ADS_PROVIDER,
  GOOGLE_ANALYTICS_PROVIDER,
  GOOGLE_SEARCH_CONSOLE_PROVIDER,
  GOOGLE_WORKSPACE_PROVIDER,
} from '@/lib/integrations/oauth/google';
import { SALESFORCE_PROVIDER } from '@/lib/integrations/oauth/salesforce';
import { HUBSPOT_PROVIDER } from '@/lib/integrations/oauth/hubspot';
import { SLACK_PROVIDER } from '@/lib/integrations/oauth/slack';
import { GITHUB_PROVIDER } from '@/lib/integrations/oauth/github';
import { LINEAR_PROVIDER } from '@/lib/integrations/oauth/linear';
import { NOTION_PROVIDER } from '@/lib/integrations/oauth/notion';
import { FIGMA_PROVIDER } from '@/lib/integrations/oauth/figma';

const STATE_COOKIE_PREFIX = 'grid_int_state_';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await params;
  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const def = findProvider(provider);
  if (!def) return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  if (def.authType !== 'oauth') {
    return Response.json(
      { error: `${def.name} is an ${def.authType} provider, use POST /api/integrations instead` },
      { status: 400 },
    );
  }
  if (!def.implemented) {
    return Response.json({ error: `${def.name} is not yet implemented` }, { status: 400 });
  }

  // Provider dispatcher — each implemented OAuth provider plugs in
  // here. We keep the switch explicit rather than dynamic-import so
  // static analysis can see which providers are actually wired.
  let authorizeUrl: string;
  const state = generateState();
  try {
    if (provider === 'meta_ads') {
      authorizeUrl = buildAuthorizeUrl(META_PROVIDER, def.scopes, state);
    } else if (provider === 'google_ads') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_ADS_PROVIDER, def.scopes, state);
    } else if (provider === 'google_analytics') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_ANALYTICS_PROVIDER, def.scopes, state);
    } else if (provider === 'google_search_console') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_SEARCH_CONSOLE_PROVIDER, def.scopes, state);
    } else if (provider === 'google_workspace') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_WORKSPACE_PROVIDER, def.scopes, state);
    } else if (provider === 'salesforce') {
      authorizeUrl = buildAuthorizeUrl(SALESFORCE_PROVIDER, def.scopes, state);
    } else if (provider === 'hubspot') {
      authorizeUrl = buildAuthorizeUrl(HUBSPOT_PROVIDER, def.scopes, state);
    } else if (provider === 'slack') {
      authorizeUrl = buildAuthorizeUrl(SLACK_PROVIDER, def.scopes, state);
    } else if (provider === 'github') {
      authorizeUrl = buildAuthorizeUrl(GITHUB_PROVIDER, def.scopes, state);
    } else if (provider === 'linear') {
      authorizeUrl = buildAuthorizeUrl(LINEAR_PROVIDER, def.scopes, state);
    } else if (provider === 'notion') {
      authorizeUrl = buildAuthorizeUrl(NOTION_PROVIDER, def.scopes, state);
    } else if (provider === 'figma') {
      authorizeUrl = buildAuthorizeUrl(FIGMA_PROVIDER, def.scopes, state);
    } else {
      return Response.json(
        { error: `No OAuth start handler implemented for ${provider}` },
        { status: 400 },
      );
    }
  } catch (err) {
    // Missing env var at this stage = operator hasn't registered the
    // OAuth app yet. Surface the underlying message so the dev sees
    // "Missing required env var: META_APP_ID" and knows what to do.
    const message = err instanceof Error ? err.message : 'Failed to build authorize URL';
    return Response.json({ error: message }, { status: 500 });
  }

  // Cookie payload: <state>.<environmentId>. The environmentId is
  // NOT confidential but binding it to the cookie prevents a
  // redirect-spoofing attack where a token gets stored under a
  // different environment than the one the user kicked off from.
  const payload = `${state}.${environmentId}`;
  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes to complete the flow
    path: '/',
  });

  return Response.redirect(authorizeUrl, 302);
}
