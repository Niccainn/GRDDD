/**
 * Salesforce OAuth provider. Salesforce is spec-compliant except for
 * two quirks:
 *
 *   - Token exchange returns an `instance_url` which tells us which
 *     Salesforce pod to hit for API calls. We must persist this
 *     alongside the access token; losing it means we don't know
 *     where to send requests.
 *
 *   - Production vs sandbox orgs use different login hostnames
 *     (login.salesforce.com vs test.salesforce.com). We default to
 *     production; sandbox support is a Phase 5 concern.
 */

import type { OAuthProvider } from './base';
import { exchangeCodeForTokens } from './base';

export const SALESFORCE_PROVIDER: OAuthProvider = {
  id: 'salesforce',
  authorizeUrl: 'https://login.salesforce.com/services/oauth2/authorize',
  tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
  clientIdEnv: 'SALESFORCE_CLIENT_ID',
  clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
  scopeSeparator: ' ',
};

export type SalesforceTokenResult = {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type?: string;
};

export async function completeSalesforceOAuth(code: string, baseUrl?: string): Promise<SalesforceTokenResult> {
  const res = await exchangeCodeForTokens(SALESFORCE_PROVIDER, code, baseUrl);
  // Salesforce returns non-standard fields in addition to the spec ones.
  return res as unknown as SalesforceTokenResult;
}

export async function testSalesforceToken(accessToken: string, instanceUrl: string) {
  const res = await fetch(`${instanceUrl}/services/data/v60.0/`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce token test failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return { ok: true as const, instanceUrl };
}
