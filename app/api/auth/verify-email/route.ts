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

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^(https?:\/\/)?/, 'https://') ||
    'http://localhost:3000'
  );
}

export async function GET(req: NextRequest) {
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
