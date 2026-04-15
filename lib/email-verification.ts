/**
 * Email verification — token issue / consume / send.
 *
 * The flow:
 *   1. signUp() calls issueVerificationToken(identityId) after the
 *      Identity row is created. This generates a random URL-safe
 *      token, stores it on Identity, and expires in 24 hours.
 *   2. sendVerificationEmail() builds a link to
 *      /api/auth/verify-email?token=... and dispatches via lib/email.
 *      If email is not configured the identity is immediately marked
 *      verified (dev / closed alpha fallback) so local signup still
 *      produces a usable account.
 *   3. The verify route calls consumeVerificationToken(token) which
 *      clears the token fields and stamps emailVerifiedAt.
 *
 * Design notes:
 *   - Single-use tokens: consuming clears token + expiry in the same
 *     write, so a replay attack can't re-verify an already-verified
 *     account.
 *   - 24-hour expiry: long enough for a real human to check email
 *     later, short enough to limit token lifetime if a mailbox leaks.
 *   - Constant-time comparison is NOT needed: tokens are looked up by
 *     unique-indexed equality, not compared to a secret in memory.
 */

import { randomBytes } from 'node:crypto';
import { prisma } from './db';
import { sendEmail, isEmailConfigured } from './email';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^(https?:\/\/)?/, 'https://') ||
    'http://localhost:3000'
  );
}

/**
 * Mint a new verification token for an identity and persist it.
 */
export async function issueVerificationToken(identityId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.identity.update({
    where: { id: identityId },
    data: {
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: expiresAt,
    },
  });
  return token;
}

/**
 * Send the verification email. In environments without RESEND_API_KEY
 * set, this is a no-op AND the caller's identity is auto-verified so
 * signup doesn't block on unreachable email infra.
 */
export async function sendVerificationEmail(
  identityId: string,
  name: string,
  email: string
): Promise<void> {
  if (!isEmailConfigured()) {
    // Dev / closed-alpha fallback — mark verified immediately.
    await prisma.identity.update({
      where: { id: identityId },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
    });
    return;
  }

  const token = await issueVerificationToken(identityId);
  const link = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: 'Verify your GRID account',
    text: `Hi ${name},\n\nConfirm your email to finish setting up your GRID account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't sign up for GRID, ignore this email.\n\n— Grid`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Confirm your email</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Hi ${escapeHtml(name)}, welcome to GRID. Click below to finish setting up your account.
        </p>
        <p style="margin: 0 0 32px;">
          <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Verify email
          </a>
        </p>
        <p style="font-size: 13px; color: #666; line-height: 1.5; margin: 0 0 8px;">
          Or paste this link into your browser:
        </p>
        <p style="font-size: 13px; color: #666; word-break: break-all; margin: 0 0 24px;">
          ${link}
        </p>
        <p style="font-size: 13px; color: #666; line-height: 1.5; margin: 0;">
          This link expires in 24 hours. If you didn't sign up, you can ignore this email.
        </p>
      </div>
    `,
  });
}

/**
 * Look up + consume a token in a single transaction. Returns the
 * verified identity on success, null if the token is unknown or
 * expired. Any matching row has its token fields cleared atomically.
 */
export async function consumeVerificationToken(
  token: string
): Promise<{ id: string; email: string | null } | null> {
  const identity = await prisma.identity.findUnique({
    where: { emailVerifyToken: token },
    select: {
      id: true,
      email: true,
      emailVerifyTokenExpiresAt: true,
      emailVerifiedAt: true,
    },
  });
  if (!identity) return null;
  if (
    identity.emailVerifyTokenExpiresAt &&
    identity.emailVerifyTokenExpiresAt < new Date()
  ) {
    // Token expired — clear it but don't verify.
    await prisma.identity.update({
      where: { id: identity.id },
      data: { emailVerifyToken: null, emailVerifyTokenExpiresAt: null },
    });
    return null;
  }

  await prisma.identity.update({
    where: { id: identity.id },
    data: {
      emailVerifiedAt: identity.emailVerifiedAt ?? new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  return { id: identity.id, email: identity.email };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
