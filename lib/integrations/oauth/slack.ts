/**
 * Slack OAuth provider. Quirk: Slack's token response includes a
 * nested `authed_user` + `team` object instead of the flat OAuth2
 * token shape. We override the exchange step to unwrap into our
 * standard shape.
 */

import type { OAuthProvider } from './base';

export const SLACK_PROVIDER: OAuthProvider = {
  id: 'slack',
  authorizeUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  clientIdEnv: 'SLACK_CLIENT_ID',
  clientSecretEnv: 'SLACK_CLIENT_SECRET',
  scopeSeparator: ',',
};

export type SlackTokenResult = {
  access_token: string;
  bot_user_id: string;
  team: { id: string; name: string };
  scope: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Slack returns 200 even on error — we must inspect `ok`. */
export async function completeSlackOAuth(code: string, redirectUri: string): Promise<SlackTokenResult> {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv('SLACK_CLIENT_ID'),
    client_secret: requireEnv('SLACK_CLIENT_SECRET'),
    redirect_uri: redirectUri,
  });
  const res = await fetch(SLACK_PROVIDER.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  const payload = (await res.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    bot_user_id?: string;
    team?: { id: string; name: string };
    scope?: string;
  };
  if (!payload.ok || !payload.access_token || !payload.team) {
    throw new Error(`Slack OAuth failed: ${payload.error ?? 'unknown error'}`);
  }
  return {
    access_token: payload.access_token,
    bot_user_id: payload.bot_user_id ?? '',
    team: payload.team,
    scope: payload.scope ?? '',
  };
}

export async function testSlackToken(accessToken: string) {
  const res = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { ok: boolean; error?: string; team?: string; user?: string };
  if (!data.ok) throw new Error(`Slack auth.test failed: ${data.error ?? 'unknown'}`);
  return { ok: true as const, team: data.team, user: data.user };
}
