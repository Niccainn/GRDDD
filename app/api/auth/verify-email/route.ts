/**
 * GET /api/auth/verify-email?token=...
 *
 * Consume a verification token and redirect the user to a friendly
 * confirmation page. This endpoint is intentionally idempotent from
 * the user's perspective — clicking twice either lands them on the
 * success page (the first click already consumed the token) or on an
 * expired-link page. We never 500 on a stale token.
 */
import { NextRequest } from 'next/server';
import { consumeVerificationToken } from '@/lib/email-verification';
import { rateLimitDistributed } from '@/lib/rate-limit';

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^(https?:\/\/)?/, 'https://') ||
    'http://localhost:3000'
  );
}

export async function GET(req: NextRequest) {
  // Rate limit by IP: 10 attempts per 15 minutes.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await rateLimitDistributed(`verify:ip:${ip}`, 10, 15 * 60_000);
  if (!rl.allowed) {
    return Response.redirect(`${appUrl()}/sign-in?verify=rate-limited`, 303);
  }

  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.redirect(`${appUrl()}/sign-in?verify=missing`, 303);
  }

  const result = await consumeVerificationToken(token);
  if (!result) {
    return Response.redirect(`${appUrl()}/sign-in?verify=expired`, 303);
  }

  return Response.redirect(`${appUrl()}/?verify=ok`, 303);
}
