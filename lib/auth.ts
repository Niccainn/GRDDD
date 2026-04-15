import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { sendVerificationEmail } from './email-verification';

const SESSION_COOKIE = 'grid_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthIdentity = {
  id: string;
  name: string;
  email: string | null;
  type: string;
  avatar: string | null;
};

/**
 * Get the authenticated identity from the session cookie.
 * Returns null if not authenticated (does not throw).
 */
export async function getAuthIdentityOrNull(): Promise<AuthIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { identity: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  if (session.identity.deletedAt) return null;

  return {
    id: session.identity.id,
    name: session.identity.name,
    email: session.identity.email,
    type: session.identity.type,
    avatar: session.identity.avatar,
  };
}

/**
 * Get the authenticated identity. Throws a Response if not authenticated.
 */
export async function getAuthIdentity(): Promise<AuthIdentity> {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return identity;
}

/**
 * Sign up a new user with email + password.
 */
export async function signUp(name: string, email: string, password: string) {
  const existing = await prisma.identity.findUnique({ where: { email } });
  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const identity = await prisma.identity.create({
    data: { type: 'PERSON', name, email, passwordHash },
  });

  // Fire the verification email. When RESEND_API_KEY is unset this
  // auto-marks the identity verified and returns immediately, so local
  // dev and closed-alpha signups don't block on mail infra. In prod
  // the email is sent but we still create the session — the app
  // surfaces a "please verify" banner rather than blocking sign-in,
  // so the first-touch UX isn't a dead-end if the email is delayed.
  try {
    await sendVerificationEmail(identity.id, name, email);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[signUp] sendVerificationEmail failed:', err);
  }

  return createSession(identity.id);
}

/**
 * Sign in with email + password.
 */
export async function signIn(email: string, password: string) {
  const identity = await prisma.identity.findUnique({ where: { email } });
  if (!identity || !identity.passwordHash || identity.deletedAt) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, identity.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  return createSession(identity.id);
}

/**
 * Sign out — delete session.
 */
export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Create a new session and set the cookie. Exported so OAuth
 * callbacks (lib/auth/google.ts, future providers) can mint a
 * session after verifying an external identity without duplicating
 * cookie/session logic.
 */
export async function createSession(identityId: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: { token, identityId, expiresAt },
  });

  const cookieStore = await cookies();
  // sameSite=strict is our CSRF defense: a cross-origin form post or
  // fetch cannot carry this cookie, so an attacker page cannot
  // authenticate a state-changing request as the victim. The trade-off
  // is that following an external link into the app won't carry the
  // session on the first hop — the landing page will 302 through
  // /sign-in and bounce back. Acceptable for an internal work OS.
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });

  const identity = await prisma.identity.findUnique({ where: { id: identityId } });
  return { id: identity!.id, name: identity!.name, email: identity!.email };
}

/**
 * Alias for createSession — used by OAuth and demo routes.
 */
export const createSessionForIdentity = createSession;

/**
 * Upsert an identity from an OAuth provider. Links by email if an
 * account already exists; otherwise creates a new one.
 */
export async function upsertOAuthIdentity(profile: {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  avatar?: string | null;
}) {
  // Try to find existing identity by email
  const existing = await prisma.identity.findUnique({
    where: { email: profile.email },
  });

  if (existing) {
    // Update with latest OAuth info
    return prisma.identity.update({
      where: { id: existing.id },
      data: {
        name: existing.name || profile.name,
        avatar: profile.avatar ?? existing.avatar,
        authId: `${profile.provider}:${profile.providerAccountId}`,
      },
    });
  }

  // Create new identity
  return prisma.identity.create({
    data: {
      type: 'PERSON',
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar ?? null,
      authId: `${profile.provider}:${profile.providerAccountId}`,
    },
  });
}
