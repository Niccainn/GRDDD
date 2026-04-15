/**
 * Google OAuth 2.0 — Authorization Code flow with PKCE.
 *
 * Flow:
 *   1. /api/auth/oauth/google/start generates a random `state` and a
 *      PKCE `verifier`, stores both in a short-lived cookie, and
 *      302s the browser to Google's consent screen.
 *   2. Google redirects back to /api/auth/oauth/google/callback
 *      with `code` and the original `state`. We validate the state
 *      matches the cookie, exchange the code for tokens, fetch the
 *      userinfo, find-or-create the Identity, and mint a session.
 *
 * Design notes:
 *   - We do NOT use `google-auth-library` or `googleapis`. This flow
 *     is ~60 lines of native fetch + crypto, and adding a huge SDK
 *     for one OAuth exchange is not worth the surface area.
 *   - We hit the userinfo endpoint instead of decoding the id_token.
 *     The access_token came from Google's token endpoint over TLS, so
 *     we can trust the userinfo response without implementing JWKS
 *     verification. Fewer moving parts, fewer ways to get this wrong.
 *   - State cookie is sameSite=lax, NOT strict — the existing session
 *     cookie is strict for CSRF defense, but OAuth REQUIRES lax
 *     because the browser comes back from google.com as a cross-site
 *     top-level navigation and strict cookies are dropped.
 *   - The `next` param on ?start is base64url-encoded inside state so
 *     an attacker can't forge an open-redirect via the query string.
 *     We also validate it's a relative path in the callback.
 */

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const GOOGLE_STATE_COOKIE = 'grid_oauth_state';
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes — long enough for slow consent, short enough to limit replay window
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Compute the canonical redirect URI. Must match EXACTLY what is
 * registered in the Google Cloud Console — any mismatch returns a
 * `redirect_uri_mismatch` error at the consent screen.
 */
export function googleRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}/api/auth/oauth/google/callback`;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sha256(input: string): string {
  return b64url(crypto.createHash('sha256').update(input).digest());
}

/**
 * Build the Google consent URL and store state + PKCE verifier in a
 * cookie that will come back with the user on the callback redirect.
 */
export async function beginGoogleOAuth(next?: string): Promise<string> {
  const clientId = required('GOOGLE_CLIENT_ID');
  // Don't read secret here — we only need it in the token exchange.

  const state = b64url(crypto.randomBytes(32));
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = sha256(verifier);

  // Sanitize `next`: only relative paths on our own site are allowed.
  // This prevents the state cookie from carrying an off-site redirect.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const payload = JSON.stringify({ state, verifier, next: safeNext });
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_STATE_COOKIE, Buffer.from(payload).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // IMPORTANT: must be `lax`, not `strict`. On the Google → our-domain
    // callback redirect the browser treats it as cross-site top-level
    // navigation. Strict cookies are dropped on that hop; lax cookies
    // survive. The cookie is single-use and short-lived so lax is safe.
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    // Always prompt for account selection so users with multiple Google
    // accounts can pick the right one instead of being silently signed
    // in with whichever Google happens to have active.
    prompt: 'select_account',
    access_type: 'online',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

/**
 * Complete the Google OAuth flow: validate state, exchange code for
 * tokens, fetch the user profile, return the parsed state payload.
 * Throws Error on any failure — callers should catch and redirect
 * to /sign-in?error= with a sanitized message.
 */
export async function completeGoogleOAuth(
  code: string,
  stateFromQuery: string,
): Promise<{ user: GoogleUser; next: string }> {
  const clientId = required('GOOGLE_CLIENT_ID');
  const clientSecret = required('GOOGLE_CLIENT_SECRET');

  const cookieStore = await cookies();
  const cookie = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  if (!cookie) throw new Error('OAuth session expired. Please try again.');

  // Consume the state cookie immediately — it's single-use. If the
  // exchange below fails, the user gets a fresh flow on retry.
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  let parsed: { state: string; verifier: string; next: string };
  try {
    parsed = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed OAuth state. Please try again.');
  }

  if (
    !parsed.state ||
    !crypto.timingSafeEqual(Buffer.from(parsed.state), Buffer.from(stateFromQuery))
  ) {
    throw new Error('OAuth state mismatch. Please try again.');
  }

  // Exchange the authorization code for tokens.
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      code_verifier: parsed.verifier,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${text.slice(0, 200)}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokens.access_token) {
    throw new Error('Google did not return an access token.');
  }

  // Fetch the user profile. See the module header for why we prefer
  // this over parsing id_token locally.
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error('Failed to fetch Google profile.');
  const user = (await userRes.json()) as GoogleUser;

  if (!user.email) throw new Error('Google account has no email.');
  if (!user.email_verified) {
    throw new Error('Please verify your Google account email before signing in.');
  }

  return { user, next: parsed.next };
}

/**
 * Find-or-create the Identity row for a Google user. Matches by
 * email (unique in our schema) and links the external provider via
 * `authId = google:<sub>`. Google-authed accounts are considered
 * email-verified at creation since Google already verified the mailbox.
 */
export async function upsertGoogleIdentity(user: GoogleUser): Promise<{ id: string; isNew: boolean }> {
  const existing = await prisma.identity.findUnique({ where: { email: user.email } });

  if (existing) {
    // If the account existed with a different auth provider (e.g.
    // credentials) we link Google to it on first successful sign-in.
    // The account keeps its existing password — the user can still
    // sign in either way afterwards.
    const patch: {
      authId?: string;
      emailVerifiedAt?: Date;
      avatar?: string;
    } = {};
    if (!existing.authId) patch.authId = `google:${user.sub}`;
    if (!existing.emailVerifiedAt) patch.emailVerifiedAt = new Date();
    if (!existing.avatar && user.picture) patch.avatar = user.picture;
    if (Object.keys(patch).length > 0) {
      await prisma.identity.update({ where: { id: existing.id }, data: patch });
    }
    return { id: existing.id, isNew: false };
  }

  const created = await prisma.identity.create({
    data: {
      type: 'PERSON',
      name: user.name || user.given_name || user.email.split('@')[0],
      email: user.email,
      authId: `google:${user.sub}`,
      avatar: user.picture || null,
      emailVerifiedAt: new Date(),
      // passwordHash intentionally null — Google-only accounts can use
      // /forgot-password to set one later if they want credentials too.
    },
  });
  return { id: created.id, isNew: true };
}
