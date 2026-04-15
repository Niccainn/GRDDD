/**
 * Linear OAuth provider. Linear is spec-compliant OAuth2 — no
 * surprises. Tokens are long-lived (no expiry in practice) so we
 * don't need a refresh dance.
 */

import type { OAuthProvider } from './base';

export const LINEAR_PROVIDER: OAuthProvider = {
  id: 'linear',
  authorizeUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  clientIdEnv: 'LINEAR_CLIENT_ID',
  clientSecretEnv: 'LINEAR_CLIENT_SECRET',
  scopeSeparator: ',',
};

export async function testLinearToken(accessToken: string) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: '{ viewer { id name email } }' }),
  });
  const data = (await res.json()) as { data?: { viewer: { id: string; name: string; email: string } }; errors?: { message: string }[] };
  if (data.errors) throw new Error(`Linear token test failed: ${data.errors[0].message}`);
  const viewer = data.data?.viewer;
  return { ok: true as const, userId: viewer?.id, name: viewer?.name, email: viewer?.email };
}
