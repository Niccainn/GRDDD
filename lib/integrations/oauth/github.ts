/**
 * GitHub OAuth provider. Spec-compliant except tokens don't expire
 * by default (OAuth Apps). If the user installs a GitHub App instead
 * they get refresh tokens — we'll add that path in Phase 5 if needed.
 */

import type { OAuthProvider } from './base';

export const GITHUB_PROVIDER: OAuthProvider = {
  id: 'github',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  clientIdEnv: 'GITHUB_CLIENT_ID',
  clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  scopeSeparator: ' ',
};

export async function getGitHubUser(accessToken: string): Promise<{ login: string; id: number; name: string | null }> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Grid',
    },
  });
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
  return (await res.json()) as { login: string; id: number; name: string | null };
}

export async function testGitHubToken(accessToken: string) {
  const user = await getGitHubUser(accessToken);
  return { ok: true as const, login: user.login, userId: user.id };
}
