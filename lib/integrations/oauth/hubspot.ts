/**
 * HubSpot OAuth provider. Spec-compliant OAuth2. The token exchange
 * returns a refresh_token; access tokens expire in ~30 minutes so we
 * always persist the refresh_token and refresh lazily on the read path.
 */

import type { OAuthProvider } from './base';

export const HUBSPOT_PROVIDER: OAuthProvider = {
  id: 'hubspot',
  authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
  clientIdEnv: 'HUBSPOT_CLIENT_ID',
  clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
  scopeSeparator: ' ',
};

export async function getHubSpotAccountInfo(accessToken: string): Promise<{ portalId: number; uiDomain: string }> {
  const res = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot account info failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { portalId: number; uiDomain: string };
  return data;
}

export async function testHubSpotToken(accessToken: string) {
  const info = await getHubSpotAccountInfo(accessToken);
  return { ok: true as const, portalId: info.portalId, uiDomain: info.uiDomain };
}
