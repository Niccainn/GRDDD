/**
 * POST /api/auth/resend-verification
 *
 * Re-issue an email-verification token and resend the email. Used by
 * the /sign-in "expired link" banner and the in-app "please verify"
 * banner so users with a stale or lost verification email can recover
 * without having to ask support.
 *
 * Enumeration safety:
 *   The success response shape is the same for every input — known
 *   address, unknown address, already-verified, throttled.  An
 *   attacker cannot use this endpoint to enumerate which emails have
 *   accounts.  The actual email is only sent when the address resolves
 *   to an unverified Identity.
 *
 * Rate limit:
 *   3 attempts per 15 min per email (a verified user might hit this
 *   once by mistake; a real spammer would need to walk a wordlist).
 *   Plus the standard per-IP signup limiter to slow bot farms.
 */
import { NextRequest } from 'next/server';
import { hashEmail } from '@/lib/crypto/email-hash';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email-verification';
import { rateLimitDistributed } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAFE_RESPONSE = {
  success: true,
  message: "If an account exists for that address, we've sent a fresh verification email.",
};

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_RE.test(email)) {
    // Reject malformed addresses up front — those don't deserve the
    // enumeration-safe wrapper, the user just typo'd.
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // Rate limits — per email AND per IP. Per email is the spam guard;
  // per IP throttles a script walking many addresses.
  const ip = clientIp(req);
  const ipLimit = await rateLimitDistributed(`resend-verify:ip:${ip}`, 10, 15 * 60_000);
  if (!ipLimit.allowed) {
    const minutes = Math.max(1, Math.ceil((ipLimit.resetAt - Date.now()) / 60_000));
    return Response.json(
      { error: `Too many requests from this address. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429 },
    );
  }
  const emailLimit = await rateLimitDistributed(`resend-verify:email:${email}`, 3, 15 * 60_000);
  // Don't surface the per-email throttle separately — return the safe
  // success shape so an attacker can't tell whether the throttle hit.
  if (!emailLimit.allowed) return Response.json(SAFE_RESPONSE);

  // Look up the identity by emailHash (deterministic) and only send
  // when the account exists AND isn't already verified.
  const hash = hashEmail(email);
  const identity = hash
    ? await prisma.identity.findUnique({
        where: { emailHash: hash },
        select: { id: true, name: true, emailVerifiedAt: true },
      })
    : null;

  if (identity && !identity.emailVerifiedAt) {
    try {
      await sendVerificationEmail(identity.id, identity.name, email);
    } catch (err) {
      // Log but don't surface — this endpoint must not become a way to
      // probe whether mail infra is up for a given address.
      console.error('[resend-verification] sendVerificationEmail failed:', err);
    }
  }

  return Response.json(SAFE_RESPONSE);
}
