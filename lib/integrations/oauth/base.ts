/**
 * OAuth primitives shared across every OAuth provider.
 *
 * A provider module (lib/integrations/oauth/<id>.ts) exports a single
 * OAuthProvider object describing its endpoints and client metadata;
 * this file provides the three stateless helpers the router layer
 * needs: build authorize URL, exchange code for tokens, refresh an
 * expired access token.
 *
 * State handling is deliberately NOT in here. The route handler owns
 * `state` generation and verification via a short-lived HttpOnly
 * cookie — we never want state/nonce logic to drift across providers.
 *
 * All token exchange uses application/x-www-form-urlencoded because
 * every OAuth2 spec we target (Meta, Google, Slack, Salesforce, etc.)
 * accepts it and some reject JSON. Keeping one code path prevents the
 * per-provider bugs we'd hit by encoding differently for each.
 */

import { webcrypto as nodeWebcrypto } from 'node:crypto';

// globalThis.crypto is present in the edge runtime + modern Node; the
// import fallback covers older Node runtimes that run this code.
const cryptoImpl = (globalThis.crypto ?? nodeWebcrypto) as Crypto;

export type OAuthProvider = {
  id: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Space-separated in Google/GitHub style; comma-separated for Meta. */
  scopeSeparator: ' ' | ',';
  /** Extra static params to append to authorize URLs (e.g. `prompt=consent`). */
  extraAuthorizeParams?: Record<string, string>;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

/** Reads a required env var, throwing a clear error if missing. */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Build the redirect_uri the OAuth provider will call back to. We
 * route every provider through the same pattern, so this is a pure
 * function of provider id + base URL.
 */
export function buildRedirectUri(providerId: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/integrations/oauth/${providerId}/callback`;
}

/** Construct the authorize URL the user's browser should be sent to. */
export function buildAuthorizeUrl(
  provider: OAuthProvider,
  scopes: string[],
  state: string,
  baseUrl?: string,
): string {
  const clientId = requireEnv(provider.clientIdEnv);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildRedirectUri(provider.id, baseUrl),
    response_type: 'code',
    scope: scopes.join(provider.scopeSeparator),
    state,
    ...(provider.extraAuthorizeParams ?? {}),
  });
  return `${provider.authorizeUrl}?${params.toString()}`;
}

/** Exchange an authorization code for access (+ refresh) tokens. */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  baseUrl?: string,
): Promise<TokenResponse> {
  const clientId = requireEnv(provider.clientIdEnv);
  const clientSecret = requireEnv(provider.clientSecretEnv);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: buildRedirectUri(provider.id, baseUrl),
  });
  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/**
 * Refresh an expired access token using a stored refresh token. Some
 * providers (Meta long-lived tokens) don't issue refresh tokens and
 * instead return a new access token from a dedicated endpoint — each
 * provider that diverges from this flow can override it, but most
 * match the spec.
 */
export async function refreshAccessToken(
  provider: OAuthProvider,
  refreshToken: string,
): Promise<TokenResponse> {
  const clientId = requireEnv(provider.clientIdEnv);
  const clientSecret = requireEnv(provider.clientSecretEnv);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Random, URL-safe state value for CSRF protection. */
export function generateState(): string {
  // Crypto-quality randomness; base64url without padding.
  const bytes = new Uint8Array(24);
  cryptoImpl.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
