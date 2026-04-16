/**
 * POST /api/auth/forgot-password
 *
 * Accepts { email } and always returns 200 with a generic success
 * message, regardless of whether the email belongs to a real
 * account. This prevents user enumeration via the reset flow.
 *
 * If the email exists and has a passwordHash, we issue a token and
 * send the reset email. If the email exists but is Google-only (no
 * passwordHash), we still send an email — but the email explains
 * they can either keep using Google or set a password here, so the
 * flow doubles as "upgrade my Google-only account to credentials."
 *
 * Public route — whitelisted in middleware under /api/auth/forgot-password.
 */
import { prisma } from '@/lib/db';
import { hashEmail } from '@/lib/crypto/email-hash';
import { sendResetEmail, constantTimeWork } from '@/lib/auth/password-reset';
import { rateLimitDistributed } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Rate limit by IP: 5 attempts per 15 minutes.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimitDistributed(`forgot:ip:${ip}`, 5, 15 * 60_000);
    if (!rl.allowed) {
      // Still return 200 with { ok: true } to prevent enumeration via
      // different status codes, but silently drop the request.
      return Response.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return Response.json({ ok: true }); // Still 200 — no enumeration.
    }

    // Secondary rate limit by email: 3 attempts per 15 minutes.
    const emailRl = await rateLimitDistributed(`forgot:email:${email}`, 3, 15 * 60_000);
    if (!emailRl.allowed) {
      return Response.json({ ok: true });
    }

    const fpHash = hashEmail(email);
    const identity = fpHash
      ? await prisma.identity.findUnique({ where: { emailHash: fpHash } })
      : await prisma.identity.findFirst({ where: { email } });
    let devLink: string | null = null;
    if (identity && !identity.deletedAt) {
      devLink = await sendResetEmail(identity.id, identity.name, email);
    } else {
      // Constant-ish time budget on misses so attackers can't use
      // response latency to distinguish hit vs miss. bcrypt(12) is
      // ~100ms on modern hardware; the real path also does one.
      await constantTimeWork();
    }

    // Dev fallback: when email isn't configured AND we're not in
    // production, return the reset link directly so the UI can
    // expose it. This is gated on NODE_ENV so production never
    // leaks the link and the enumeration guarantee is preserved.
    if (process.env.NODE_ENV !== 'production' && devLink) {
      return Response.json({ ok: true, devResetLink: devLink });
    }
    return Response.json({ ok: true });
  } catch {
    // Never leak internal errors on this endpoint either.
    return Response.json({ ok: true });
  }
}
