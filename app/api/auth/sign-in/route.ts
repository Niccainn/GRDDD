/**
 * POST /api/auth/sign-in
 *
 * Auth perimeter endpoint. Defended in three layers before the
 * password check is even attempted:
 *
 *   1. Per-IP rate limit (10 / 15 min) — slows enumeration scans
 *   2. Per-email rate limit (5 / 15 min) — slows credential stuffing
 *      against a known target
 *   3. Email lockout window (handled inside signIn) for sustained abuse
 *
 * Layers 1 and 2 use the distributed (Upstash) limiter when
 * configured so that horizontally-scaled Vercel instances share state.
 * Without that, each cold start would have its own counter and an
 * attacker could fan out to bypass.
 */
import { NextRequest } from 'next/server';
import { signIn } from '@/lib/auth';
import {
  rateLimitSignInByIpDistributed,
  rateLimitSignInByEmailDistributed,
} from '@/lib/rate-limit';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function tooMany(remainingMs: number): Response {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return Response.json(
    { error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
    { status: 429 }
  );
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const ip = clientIp(req);
  const ipLimit = await rateLimitSignInByIpDistributed(ip);
  if (!ipLimit.allowed) {
    return tooMany(ipLimit.resetAt - Date.now());
  }

  const emailLimit = await rateLimitSignInByEmailDistributed(email);
  if (!emailLimit.allowed) {
    return tooMany(emailLimit.resetAt - Date.now());
  }

  try {
    const identity = await signIn(email, password);
    const res = Response.json({ success: true, identity });

    // If the user has already completed onboarding, set the cookie so
    // middleware doesn't redirect them to /welcome on every page load.
    if (identity.onboardedAt) {
      const headers = new Headers(res.headers);
      headers.append(
        'Set-Cookie',
        `grid_onboarded=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 365}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      );
      return new Response(res.body, { status: res.status, headers });
    }

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sign in failed';
    return Response.json({ error: message }, { status: 401 });
  }
}
