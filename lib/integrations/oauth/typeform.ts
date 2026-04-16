/**
 * Typeform OAuth provider.
 *
 * Standard OAuth2 flow. Scopes: forms:read responses:read.
 * Typeform tokens are long-lived. No refresh token dance needed.
 */

import type { OAuthProvider } from './base';

export const TYPEFORM_PROVIDER: OAuthProvider = {
  id: 'typeform',
  authorizeUrl: 'https://api.typeform.com/oauth/authorize',
  tokenUrl: 'https://api.typeform.com/oauth/token',
  clientIdEnv: 'TYPEFORM_CLIENT_ID',
  clientSecretEnv: 'TYPEFORM_CLIENT_SECRET',
  scopeSeparator: ' ',
};

/** Fetch the authenticated Typeform user profile. */
export async function getTypeformUser(accessToken: string): Promise<{
  user_id: string;
  alias: string;
  email: string;
}> {
  const res = await fetch('https://api.typeform.com/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Typeform /me failed (${res.status})`);
  return (await res.json()) as { user_id: string; alias: string; email: string };
}
