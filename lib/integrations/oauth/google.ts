/**
 * Google OAuth — shared base for Google Ads, Analytics, Search
 * Console, and Workspace. All four providers share one Google Cloud
 * OAuth Client ID (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) but ride
 * different scope bundles + different redirect URIs so the user can
 * install each surface independently.
 *
 * Google's OAuth2 is spec-compliant so the base helpers work out of
 * the box. The two quirks we handle here:
 *
 *   - `access_type=offline` + `prompt=consent` on the authorize URL
 *     so we actually get a refresh_token on first consent. Google
 *     silently drops the refresh token if you omit `prompt=consent`
 *     after the user has already consented once — that's the #1
 *     cause of "why is my Google integration randomly dead" tickets.
 *
 *   - Google Ads needs a `developer-token` header on API calls in
 *     addition to the bearer token. That header comes from
 *     GOOGLE_ADS_DEVELOPER_TOKEN and is used by the client layer,
 *     not here.
 */

import type { OAuthProvider, TokenResponse } from './base';
import {
  buildAuthorizeUrl as baseBuildAuthorize,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './base';

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

/**
 * Build a google provider definition for a specific surface (ads,
 * analytics, search_console, workspace). Each id gets its own
 * redirect URI so the Cloud Console redirect list stays scoped.
 */
function googleProvider(id: string): OAuthProvider {
  return {
    id,
    authorizeUrl: GOOGLE_AUTHORIZE,
    tokenUrl: GOOGLE_TOKEN,
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopeSeparator: ' ',
    extraAuthorizeParams: {
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    },
  };
}

export const GOOGLE_ADS_PROVIDER = googleProvider('google_ads');
export const GOOGLE_ANALYTICS_PROVIDER = googleProvider('google_analytics');
export const GOOGLE_SEARCH_CONSOLE_PROVIDER = googleProvider('google_search_console');
export const GOOGLE_WORKSPACE_PROVIDER = googleProvider('google_workspace');
export const GOOGLE_CALENDAR_PROVIDER = googleProvider('google_calendar');

export function buildGoogleAuthorizeUrl(
  provider: OAuthProvider,
  scopes: string[],
  state: string,
  baseUrl?: string,
): string {
  return baseBuildAuthorize(provider, scopes, state, baseUrl);
}

/** Complete the code → tokens exchange. Google returns refresh_token. */
export async function completeGoogleOAuth(
  provider: OAuthProvider,
  code: string,
  baseUrl?: string,
): Promise<TokenResponse> {
  return await exchangeCodeForTokens(provider, code, baseUrl);
}

/** Refresh an expired Google access token using a stored refresh token. */
export async function refreshGoogleAccessToken(
  provider: OAuthProvider,
  refreshToken: string,
): Promise<TokenResponse> {
  return await refreshAccessToken(provider, refreshToken);
}

/**
 * Ping Google to confirm a token is still valid + return basic
 * identity. Used by the /test endpoint across all four Google
 * surfaces.
 */
export async function testGoogleToken(accessToken: string): Promise<{
  ok: true;
  email: string;
  sub: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token test failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { email: string; sub: string };
  return { ok: true, email: data.email, sub: data.sub };
}
