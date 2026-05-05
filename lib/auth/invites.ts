/**
 * Invite tokens — issue / validate / consume.
 *
 * Mirrors the password-reset shape (lib/auth/password-reset.ts):
 *   - Token is 32 random bytes, base64url-encoded.
 *   - SHA-256 hash stored at rest. Plaintext only in the issuance
 *     response and the email body.
 *   - 14-day TTL by default.
 *   - Single use enforced atomically in consumeInvite() — usedAt is
 *     set in the same transaction as the Identity.create.
 *   - Email-bound: the recipient MUST sign up with the same address
 *     the invite was issued to.
 *
 * What this does NOT do:
 *   - Send the email. Caller is responsible (admin route emits it
 *     via lib/email when RESEND_API_KEY is configured, otherwise
 *     returns the link in the response).
 *   - Authorise the issuer. Caller must use lib/auth/admin.ts.
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

export type IssuedInvite = {
  id: string;
  email: string;
  expiresAt: Date;
  /** Raw token — only available at issuance time. Embed in the email link. */
  token: string;
  /** Full sign-up link with the token embedded. */
  link: string;
};

/**
 * Mint a new invite for `email`. Overwrites any prior unconsumed
 * invite for the same address — only the latest one is live.
 */
export async function issueInvite(opts: {
  email: string;
  issuedById?: string | null;
  cohort?: string | null;
  ttlMs?: number;
}): Promise<IssuedInvite> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email');
  }
  const raw = generateToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + (opts.ttlMs ?? INVITE_TTL_MS));

  // Invalidate any prior live invite for this email so re-issuing
  // doesn't leave stale tokens floating around.
  await prisma.invite.updateMany({
    where: { email, usedAt: null },
    data: { expiresAt: new Date() }, // expire-immediately is the
    // cheapest "kill" we can do without a deleteMany + recreate dance.
  });

  const invite = await prisma.invite.create({
    data: {
      email,
      tokenHash,
      expiresAt,
      issuedById: opts.issuedById ?? null,
      cohort: opts.cohort ?? null,
    },
    select: { id: true, email: true, expiresAt: true },
  });

  // Stamp the WaitlistEntry if the email is on the list — keeps the
  // admin view useful without a join.
  await prisma.waitlistEntry
    .updateMany({ where: { email }, data: { invitedAt: new Date() } })
    .catch(() => {/* non-fatal — waitlist is soft state */});

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    token: raw,
    link: `${appUrl()}/sign-up?invite=${encodeURIComponent(raw)}`,
  };
}

export type ValidatedInvite = {
  id: string;
  email: string;
  expiresAt: Date;
};

/**
 * Validate a raw token without consuming it. Returns the bound
 * email + expiry on success, null on any failure (unknown token,
 * expired, already used). Used by /sign-up to prefill email and
 * gate the form before submit.
 */
export async function validateInviteToken(raw: string): Promise<ValidatedInvite | null> {
  if (!raw || raw.length < 20 || raw.length > 200) return null;
  const tokenHash = hashToken(raw);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    select: { id: true, email: true, expiresAt: true, usedAt: true, tokenHash: true },
  });
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt < new Date()) return null;
  // Defense in depth — constant-time compare even though we looked
  // up by hash equality. Mirrors password-reset posture.
  const a = Buffer.from(invite.tokenHash, 'hex');
  const b = Buffer.from(tokenHash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: invite.id, email: invite.email, expiresAt: invite.expiresAt };
}

/**
 * Consume an invite atomically. Throws if the token is invalid,
 * expired, used, or bound to a different email. Caller passes the
 * email used in signup; we verify it matches before consuming.
 *
 * Used inside the /api/auth/sign-up handler under a transaction so
 * Identity.create and Invite.usedAt update together — a crashed
 * signup leaves the invite reusable for retry.
 */
export async function consumeInvite(opts: {
  rawToken: string;
  signupEmail: string;
  tx?: typeof prisma; // optional Prisma transaction client
}): Promise<ValidatedInvite> {
  const client = opts.tx ?? prisma;
  const validated = await validateInviteToken(opts.rawToken);
  if (!validated) {
    throw new Error('This invite link is invalid or has expired.');
  }
  const signupEmail = opts.signupEmail.trim().toLowerCase();
  if (signupEmail !== validated.email) {
    throw new Error(
      `This invite is bound to ${validated.email}. Please sign up with that address.`,
    );
  }
  // Race-free single-use: only the first consumer wins. updateMany
  // with usedAt: null ensures a second concurrent attempt 0-rows.
  const result = await client.invite.updateMany({
    where: { id: validated.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (result.count !== 1) {
    throw new Error('This invite has already been used.');
  }
  return validated;
}
