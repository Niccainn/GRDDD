/**
 * Figma OAuth provider.
 *
 * Figma uses standard OAuth2 with these endpoints:
 *   - Authorize: https://www.figma.com/oauth
 *   - Token:     https://api.figma.com/v1/oauth/token (note: www for auth, api for token)
 *
 * Scopes: file_dev_resources:read, files:read, file_variables:read
 *
 * Figma returns a short-lived access_token + refresh_token. The
 * access token lasts ~2 hours. Refresh via the base helper.
 */

import type { OAuthProvider } from './base';

export const FIGMA_PROVIDER: OAuthProvider = {
  id: 'figma',
  authorizeUrl: 'https://www.figma.com/oauth',
  tokenUrl: 'https://api.figma.com/v1/oauth/token',
  clientIdEnv: 'FIGMA_CLIENT_ID',
  clientSecretEnv: 'FIGMA_CLIENT_SECRET',
  scopeSeparator: ',',
  extraAuthorizeParams: {
    response_type: 'code',
  },
};

/** Fetch the authenticated Figma user's name and email for accountLabel. */
export async function getFigmaUser(accessToken: string): Promise<{
  id: string;
  handle: string;
  email: string;
  img_url: string;
}> {
  const res = await fetch('https://api.figma.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Figma /me failed (${res.status})`);
  return (await res.json()) as { id: string; handle: string; email: string; img_url: string };
}
