/**
 * Mailchimp OAuth provider.
 *
 * Mailchimp uses standard OAuth2 but after the token exchange you must
 * call the metadata endpoint to discover the user's datacenter (dc)
 * and API endpoint. All subsequent API calls use that dc-specific URL.
 */

import type { OAuthProvider, TokenResponse } from './base';
import { exchangeCodeForTokens } from './base';

export const MAILCHIMP_PROVIDER: OAuthProvider = {
  id: 'mailchimp',
  authorizeUrl: 'https://login.mailchimp.com/oauth2/authorize',
  tokenUrl: 'https://login.mailchimp.com/oauth2/token',
  clientIdEnv: 'MAILCHIMP_CLIENT_ID',
  clientSecretEnv: 'MAILCHIMP_CLIENT_SECRET',
  scopeSeparator: ' ',
};

export type MailchimpMetadata = {
  dc: string;
  api_endpoint: string;
  login_url: string;
  accountname: string;
};

/** Fetch the Mailchimp metadata endpoint to get the datacenter and API URL. */
export async function getMailchimpMetadata(accessToken: string): Promise<MailchimpMetadata> {
  const res = await fetch('https://login.mailchimp.com/oauth2/metadata', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Mailchimp metadata fetch failed (${res.status})`);
  return (await res.json()) as MailchimpMetadata;
}

/**
 * Full OAuth flow: exchange code, then fetch metadata to discover
 * the datacenter-specific API endpoint.
 */
export async function completeMailchimpOAuth(code: string): Promise<{
  tokens: TokenResponse;
  metadata: MailchimpMetadata;
}> {
  const tokens = await exchangeCodeForTokens(MAILCHIMP_PROVIDER, code);
  const metadata = await getMailchimpMetadata(tokens.access_token);
  return { tokens, metadata };
}
