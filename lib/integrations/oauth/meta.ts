/**
 * Meta (Facebook/Instagram) OAuth provider definition + helpers for
 * the Meta-specific quirks:
 *
 *   - Meta returns access tokens from a *different* host than the
 *     authorize endpoint (graph.facebook.com, not www.facebook.com).
 *   - Scopes are comma-separated, not space-separated.
 *   - Instead of a refresh token, Meta issues a 60-day "long-lived"
 *     token that you obtain by calling the token endpoint with
 *     `grant_type=fb_exchange_token`. We do that immediately after
 *     the initial code exchange so the credential we store is the
 *     long-lived one, not the ~1-hour short token.
 *   - Ad-account listings come from the /me/adaccounts edge on the
 *     Graph API v20.0, which is what the client layer consumes.
 *
 * Keeping all these quirks in this file means the base OAuth helper
 * stays spec-clean and we don't accidentally leak Meta-isms into the
 * Google/Slack/HubSpot providers when we add them next.
 */

import type { OAuthProvider, TokenResponse } from './base';
import { buildAuthorizeUrl as baseBuildAuthorize, exchangeCodeForTokens, buildRedirectUri } from './base';

export const META_GRAPH_VERSION = 'v20.0';

export const META_PROVIDER: OAuthProvider = {
  id: 'meta_ads',
  authorizeUrl: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`,
  tokenUrl: `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`,
  clientIdEnv: 'META_APP_ID',
  clientSecretEnv: 'META_APP_SECRET',
  scopeSeparator: ',',
  extraAuthorizeParams: {
    // Forces the dialog even if the user has already granted scopes,
    // so users who connected a prior version with fewer scopes get
    // re-prompted for the new ones.
    auth_type: 'rerequest',
  },
};

/** Convenience wrapper so callers don't need to import two symbols. */
export function buildMetaAuthorizeUrl(scopes: string[], state: string, baseUrl?: string): string {
  return baseBuildAuthorize(META_PROVIDER, scopes, state, baseUrl);
}

/**
 * Exchange the OAuth code, then immediately upgrade to a long-lived
 * token (60-day expiry). We store the long-lived token as the access
 * token; there is no refresh token — to refresh, we just run this
 * upgrade dance again before the 60 days are up.
 */
export async function completeMetaOAuth(code: string, baseUrl?: string): Promise<TokenResponse> {
  // Step 1: code → short-lived access token.
  const shortLived = await exchangeCodeForTokens(META_PROVIDER, code, baseUrl);

  // Step 2: short-lived → long-lived (60 days).
  const clientId = process.env.META_APP_ID!;
  const clientSecret = process.env.META_APP_SECRET!;
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLived.access_token,
  });
  const res = await fetch(`${META_PROVIDER.tokenUrl}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta long-lived token exchange failed (${res.status}): ${text}`);
  }
  const longLived = (await res.json()) as TokenResponse;
  return {
    access_token: longLived.access_token,
    expires_in: longLived.expires_in ?? 60 * 24 * 60 * 60, // 60 days default
    token_type: longLived.token_type ?? 'bearer',
    scope: shortLived.scope,
  };
}

/** List ad accounts the granted user can see — used to pick accountLabel. */
export type MetaAdAccount = {
  id: string; // "act_1234567890"
  name: string;
  currency?: string;
  account_status?: number;
};

export async function listMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts`);
  url.searchParams.set('fields', 'id,name,currency,account_status');
  url.searchParams.set('access_token', accessToken);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list Meta ad accounts (${res.status}): ${text}`);
  }
  const payload = (await res.json()) as { data: MetaAdAccount[] };
  return payload.data;
}

/** Ping the token — used by /api/integrations/[id]/test. */
export async function testMetaToken(accessToken: string): Promise<{ ok: true; name: string; id: string }> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me`);
  url.searchParams.set('fields', 'id,name');
  url.searchParams.set('access_token', accessToken);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta token test failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string; name: string };
  return { ok: true, id: data.id, name: data.name };
}

// Re-export so callers can import the redirect URI from one place.
export { buildRedirectUri };
