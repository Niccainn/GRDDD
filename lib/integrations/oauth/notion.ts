/**
 * Notion OAuth provider. Notion's token exchange uses Basic auth on
 * the token endpoint (client_id:client_secret), not the form-body
 * style everyone else uses. We override the exchange step to do that.
 * Tokens don't expire and no refresh token is issued.
 */

import type { OAuthProvider } from './base';
import { buildRedirectUri } from './base';

export const NOTION_PROVIDER: OAuthProvider = {
  id: 'notion',
  authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  clientIdEnv: 'NOTION_CLIENT_ID',
  clientSecretEnv: 'NOTION_CLIENT_SECRET',
  scopeSeparator: ' ',
  extraAuthorizeParams: {
    owner: 'user',
    response_type: 'code',
  },
};

export type NotionTokenResult = {
  access_token: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string | null;
  workspace_icon: string | null;
  owner: { user?: { id: string } };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function completeNotionOAuth(code: string, baseUrl?: string): Promise<NotionTokenResult> {
  const clientId = requireEnv('NOTION_CLIENT_ID');
  const clientSecret = requireEnv('NOTION_CLIENT_SECRET');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(NOTION_PROVIDER.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: buildRedirectUri('notion', baseUrl),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as NotionTokenResult;
}

export async function testNotionToken(accessToken: string) {
  const res = await fetch('https://api.notion.com/v1/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Notion token test failed: ${res.status}`);
  const data = (await res.json()) as { bot?: { workspace_name?: string }; name?: string };
  return { ok: true as const, workspace: data.bot?.workspace_name ?? data.name };
}
