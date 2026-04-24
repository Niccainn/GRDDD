/**
 * Airtable OAuth provider.
 *
 * Airtable requires PKCE (Proof Key for Code Exchange) with S256
 * method. We generate a code_verifier, compute a SHA-256
 * code_challenge, and include it in the authorize URL.
 *
 * Scopes: data.records:read data.records:write schema.bases:read
 * (space-separated).
 *
 * Token exchange uses HTTP Basic auth (client_id:client_secret) in
 * the Authorization header rather than in the POST body.
 */

import type { OAuthProvider, TokenResponse } from './base';
import { buildRedirectUri } from './base';
import { webcrypto as nodeWebcrypto } from 'node:crypto';

// globalThis.crypto exists in the edge runtime + modern Node; the
// import fallback is for legacy Node environments that run this code
// (rare but non-zero).
const cryptoImpl = (globalThis.crypto ?? nodeWebcrypto) as Crypto;

export const AIRTABLE_PROVIDER: OAuthProvider = {
  id: 'airtable',
  authorizeUrl: 'https://airtable.com/oauth2/v1/authorize',
  tokenUrl: 'https://airtable.com/oauth2/v1/token',
  clientIdEnv: 'AIRTABLE_CLIENT_ID',
  clientSecretEnv: 'AIRTABLE_CLIENT_SECRET',
  scopeSeparator: ' ',
  extraAuthorizeParams: {
    response_type: 'code',
  },
};

/** Generate a cryptographically random code_verifier for PKCE. */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  cryptoImpl.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

/** Compute S256 code_challenge from a code_verifier. */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString('base64url');
}

/**
 * Build the Airtable authorize URL with PKCE parameters.
 * Returns both the URL and the code_verifier that must be stored
 * in the state cookie for the callback to use.
 */
export async function buildAirtableAuthorizeUrl(
  scopes: string[],
  state: string,
): Promise<{ authorizeUrl: string; codeVerifier: string }> {
  const clientId = process.env[AIRTABLE_PROVIDER.clientIdEnv];
  if (!clientId) throw new Error(`Missing required env var: ${AIRTABLE_PROVIDER.clientIdEnv}`);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildRedirectUri('airtable'),
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    authorizeUrl: `${AIRTABLE_PROVIDER.authorizeUrl}?${params.toString()}`,
    codeVerifier,
  };
}

/**
 * Exchange an authorization code for tokens. Airtable requires
 * HTTP Basic auth and the code_verifier from the PKCE flow.
 */
export async function exchangeAirtableCode(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const clientId = process.env[AIRTABLE_PROVIDER.clientIdEnv];
  const clientSecret = process.env[AIRTABLE_PROVIDER.clientSecretEnv];
  if (!clientId) throw new Error(`Missing required env var: ${AIRTABLE_PROVIDER.clientIdEnv}`);
  if (!clientSecret) throw new Error(`Missing required env var: ${AIRTABLE_PROVIDER.clientSecretEnv}`);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: buildRedirectUri('airtable'),
    code_verifier: codeVerifier,
  });

  const res = await fetch(AIRTABLE_PROVIDER.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Fetch the current user for an account label. */
export async function getAirtableUser(accessToken: string): Promise<{ id: string; email: string }> {
  const res = await fetch('https://api.airtable.com/v0/meta/whoami', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Airtable whoami failed (${res.status})`);
  return (await res.json()) as { id: string; email: string };
}
