/**
 * OAuth — lightweight provider layer for sign-in.
 *
 * Zero dependencies: uses standards-compliant authorization-code flow
 * against each provider's well-known endpoints. A provider is "enabled"
 * only if both its CLIENT_ID and CLIENT_SECRET env vars are set — this
 * lets the UI show/hide buttons without code changes.
 *
 * Flow:
 *   1. User clicks "Continue with Google"
 *      → GET /api/auth/oauth/google
 *      → we mint a `state` cookie + redirect to provider
 *   2. Provider redirects back
 *      → GET /api/auth/oauth/google/callback?code=…&state=…
 *      → we verify state, exchange code, fetch profile,
 *        upsert Identity, create session, redirect home.
 */

import crypto from 'node:crypto';

export type OAuthProviderId = 'google' | 'github' | 'microsoft';

export interface OAuthProvider {
  id: OAuthProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  /** Map the raw profile JSON → normalized identity fields. */
  parseProfile: (profile: unknown, token: string) => Promise<{
    providerAccountId: string;
    email: string | null;
    name: string;
    avatar: string | null;
  }>;
}

// ─── Provider registry ─────────────────────────────────────────────────────

const PROVIDERS: Record<OAuthProviderId, Omit<OAuthProvider, 'clientId' | 'clientSecret'>> = {
  google: {
    id: 'google',
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    parseProfile: async (profile) => {
      const p = profile as { sub: string; email?: string; name?: string; picture?: string };
      return {
        providerAccountId: p.sub,
        email: p.email ?? null,
        name: p.name || p.email || 'Google user',
        avatar: p.picture ?? null,
      };
    },
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft',
    // "common" tenant accepts both personal (outlook.com) and work / school
    // (Azure AD) accounts. Enterprises can swap to their tenant id via the
    // MICROSOFT_TENANT_ID env var — see getProvider() below.
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read',
    parseProfile: async (profile) => {
      const p = profile as {
        id: string;
        displayName?: string;
        givenName?: string;
        surname?: string;
        mail?: string;
        userPrincipalName?: string;
      };
      const email = p.mail || p.userPrincipalName || null;
      const name =
        p.displayName ||
        [p.givenName, p.surname].filter(Boolean).join(' ') ||
        email ||
        'Microsoft user';
      return {
        providerAccountId: p.id,
        email,
        name,
        avatar: null,
      };
    },
  },
  github: {
    id: 'github',
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
    parseProfile: async (profile, token) => {
      const p = profile as { id: number; login: string; name?: string; email?: string; avatar_url?: string };
      // GitHub hides the primary email unless we ask the /user/emails endpoint.
      let email = p.email ?? null;
      if (!email) {
        try {
          const res = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'grid-app' },
          });
          if (res.ok) {
            const emails = (await res.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
            email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email ?? null;
          }
        } catch {
          /* ignore — email optional */
        }
      }
      return {
        providerAccountId: String(p.id),
        email,
        name: p.name || p.login || 'GitHub user',
        avatar: p.avatar_url ?? null,
      };
    },
  },
};

export function getProvider(id: string): OAuthProvider | null {
  if (id !== 'google' && id !== 'github' && id !== 'microsoft') return null;
  const base = PROVIDERS[id];
  const envPrefix = id.toUpperCase();
  const clientId = process.env[`${envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;

  // Microsoft: enterprises can override the common tenant with their own
  // (single-tenant) tenant id. Falls back to /common otherwise.
  if (id === 'microsoft') {
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
    return {
      ...base,
      clientId,
      clientSecret,
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    };
  }

  return { ...base, clientId, clientSecret };
}

export function enabledProviders(): Array<{ id: OAuthProviderId; label: string }> {
  return (Object.keys(PROVIDERS) as OAuthProviderId[])
    .filter((id) => getProvider(id) !== null)
    .map((id) => ({ id, label: PROVIDERS[id].label }));
}

// ─── State + redirect URL helpers ──────────────────────────────────────────

export function generateState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function callbackUrl(origin: string, providerId: string): string {
  return `${origin}/api/auth/oauth/${providerId}/callback`;
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  state: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scope,
    state,
  });
  return `${provider.authorizeUrl}?${params.toString()}`;
}

// ─── Code exchange ─────────────────────────────────────────────────────────

export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string> {
  const body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`OAuth response missing access_token: ${data.error ?? 'unknown'}`);
  }
  return data.access_token;
}

export async function fetchProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<{
  providerAccountId: string;
  email: string | null;
  name: string;
  avatar: string | null;
}> {
  const res = await fetch(provider.userUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'grid-app',
    },
  });
  if (!res.ok) {
    throw new Error(`OAuth profile fetch failed (${res.status})`);
  }
  const raw = await res.json();
  return provider.parseProfile(raw, accessToken);
}
