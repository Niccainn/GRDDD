/**
 * OAuth initiate — GET /api/auth/oauth/:provider
 *
 * Mints a short-lived state cookie and 302s to the provider's
 * authorize URL. If the provider isn't configured (env vars missing),
 * redirects back to /sign-in with an error hint so the UI can explain.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProvider, generateState, callbackUrl, buildAuthorizeUrl } from '@/lib/oauth';

const STATE_COOKIE_PREFIX = 'grid_oauth_state_';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);

  if (!provider) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('error', `${providerId}_not_configured`);
    return NextResponse.redirect(url);
  }

  const state = generateState();
  const redirectUri = callbackUrl(new URL(req.url).origin, providerId);
  const authorizeUrl = buildAuthorizeUrl(provider, state, redirectUri);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(`${STATE_COOKIE_PREFIX}${providerId}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  });
  return res;
}
