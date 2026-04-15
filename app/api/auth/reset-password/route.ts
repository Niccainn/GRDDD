/**
 * POST /api/auth/reset-password
 *
 * Accepts { token, password }. On success, clears the token and
 * sets the new password. Does NOT mint a session — the user is
 * sent back to /sign-in to sign in with their new credentials, so
 * anyone who steals the reset link mid-flight cannot end up signed
 * in as the target (they also have to defeat the short expiry).
 *
 * Public route — whitelisted in middleware under /api/auth/reset-password.
 */
import { consumeResetToken } from '@/lib/auth/password-reset';
import { rateLimitDistributed } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Rate limit by IP: 5 attempts per 15 minutes.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimitDistributed(`reset:ip:${ip}`, 5, 15 * 60_000);
    if (!rl.allowed) {
      return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
      return Response.json({ error: 'Missing token or password.' }, { status: 400 });
    }
    if (password.length < 12) {
      return Response.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
    }

    await consumeResetToken(token, password);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reset failed.';
    return Response.json({ error: message }, { status: 400 });
  }
}
