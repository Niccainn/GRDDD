/**
 * Password reset — token issue / consume / email dispatch.
 *
 * Flow:
 *   1. User submits /forgot-password with their email.
 *   2. issueResetToken() generates a random token, stores its SHA-256
 *      hash on the Identity row, and returns the raw token.
 *   3. sendResetEmail() mails the user a link to
 *      /reset-password?token=<raw>.
 *   4. User opens the link and submits a new password.
 *   5. consumeResetToken() looks up the Identity by the hash of the
 *      raw token, verifies expiry, clears the token columns, and
 *      writes the new passwordHash.
 *
 * Design notes:
 *   - We store the HASH of the token at rest, not the token itself.
 *     Email verify tokens store them plaintext (that's a pre-existing
 *     choice), but password reset has higher stakes: a DB leak of
 *     plaintext reset tokens lets an attacker impersonate any user
 *     whose reset happens to be live. Hashing mitigates that.
 *   - 1-hour expiry: long enough for a real human, short enough to
 *     contain the blast radius of a mailbox compromise.
 *   - Single use: consuming clears token + expiry in the same write.
 *   - Enumeration-safe at the API layer: /api/auth/forgot-password
 *     ALWAYS returns a success message regardless of whether the
 *     email exists, so it can't be used to probe user directories.
 *     The timing of the response is also constant-ish — we still do
 *     a bcrypt hash on misses (below) to flatten the latency.
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail, isEmailConfigured } from '@/lib/email';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

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

/**
 * Issue a fresh reset token for an identity. Returns the raw token
 * (must be emailed to the user — it's never stored plaintext).
 * Overwrites any existing token so only the most recent one is live.
 */
export async function issueResetToken(identityId: string): Promise<string> {
  const raw = generateToken();
  const hash = hashToken(raw);
  const expires = new Date(Date.now() + RESET_TTL_MS);
  await prisma.identity.update({
    where: { id: identityId },
    data: {
      passwordResetTokenHash: hash,
      passwordResetTokenExpiresAt: expires,
    },
  });
  return raw;
}

/**
 * Validate a raw token from a URL and return the Identity it belongs
 * to. Returns null for any failure mode so the caller can respond
 * with a generic "invalid or expired" message.
 */
export async function findIdentityByResetToken(raw: string) {
  if (!raw || raw.length < 20) return null;
  const hash = hashToken(raw);
  const identity = await prisma.identity.findUnique({
    where: { passwordResetTokenHash: hash },
  });
  if (!identity || !identity.passwordResetTokenExpiresAt) return null;
  if (identity.passwordResetTokenExpiresAt < new Date()) return null;
  if (identity.deletedAt) return null;
  // Defense in depth: even though we looked up by hash (unique),
  // compare hashes in constant time as a belt-and-braces guard
  // against cache/timing leakage from the index lookup.
  const stored = identity.passwordResetTokenHash;
  if (!stored) return null;
  const a = Buffer.from(stored, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return identity;
}

/**
 * Atomically consume a reset token and set the new password.
 * Throws if the token is invalid or expired — callers should catch.
 */
export async function consumeResetToken(raw: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const identity = await findIdentityByResetToken(raw);
  if (!identity) {
    throw new Error('This reset link is invalid or has expired.');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.identity.update({
    where: { id: identity.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      // If the user completed a reset, their email is effectively
      // verified (they just clicked a link we sent to that mailbox).
      emailVerifiedAt: identity.emailVerifiedAt ?? new Date(),
    },
  });
  // Invalidate all other sessions for this identity. If an attacker
  // had a stolen session cookie, the rightful owner's password reset
  // should kick them out. The reset flow does not mint a new session
  // itself — the user signs in fresh afterwards.
  await prisma.session.deleteMany({ where: { identityId: identity.id } }).catch(() => {});
}

/**
 * Dispatch the reset email. When RESEND_API_KEY is unset the email
 * is logged and a dev breadcrumb is returned — match the rest of
 * our email subsystem.
 */
export async function sendResetEmail(identityId: string, name: string, email: string): Promise<string | null> {
  const raw = await issueResetToken(identityId);
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(raw)}`;

  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.log('[password-reset] dev fallback — reset link:', link);
    // Return the link so the caller (gated by NODE_ENV !== 'production')
    // can surface it in the UI during local development.
    return link;
  }

  const subject = 'Reset your GRID password';
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #E5E5E5; background: #08080C;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 40px; height: 50px; border: 2px solid rgba(255,255,255,0.35); border-radius: 6px;"></div>
      </div>
      <h1 style="font-size: 22px; font-weight: 300; color: #fff; text-align: center; margin: 0 0 12px;">Reset your password</h1>
      <p style="font-size: 14px; color: #9A9AA4; text-align: center; margin: 0 0 32px;">
        Hi ${escapeHtml(name)}, someone asked to reset the password for this account. If that was you, click below. If it wasn't, you can ignore this email — your password stays the same.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background: rgba(21, 173, 112, 0.12); border: 1px solid rgba(21, 173, 112, 0.3); border-radius: 999px; color: #15AD70; text-decoration: none; font-size: 14px; font-weight: 300;">
          Reset password
        </a>
      </div>
      <p style="font-size: 12px; color: #5A5A64; text-align: center; margin: 24px 0 0;">
        This link expires in 1 hour. If the button doesn't work, paste this into your browser:<br/>
        <span style="color: #9A9AA4; word-break: break-all;">${link}</span>
      </p>
    </div>
  `;
  const text = `Reset your GRID password\n\nHi ${name},\n\nSomeone asked to reset this account's password. If that was you, open this link (expires in 1 hour):\n\n${link}\n\nIf it wasn't you, you can ignore this email.`;

  await sendEmail({ to: email, subject, html, text });
  return null;
}

/**
 * Minimal HTML escape for name interpolation in the email template.
 * We don't need a full sanitizer — only text nodes are interpolated.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Fake-work helper used by the forgot-password route when the email
 * is not found. Runs a bcrypt hash so the response timing on misses
 * is similar to hits, flattening one side of a timing oracle.
 */
export async function constantTimeWork(): Promise<void> {
  await bcrypt.hash('__placeholder__', 12);
}
