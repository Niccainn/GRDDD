/**
 * GET /api/auth/oauth/google/start
 *
 * Kicks off Google OAuth. Reads the optional ?next= query param,
 * sets the state cookie, and 302s to Google's consent screen.
 *
 * Public route — whitelisted in middleware under /api/auth/oauth.
 */
import { NextResponse } from 'next/server';
import { beginGoogleOAuth } from '@/lib/auth/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get('next') || undefined;
    const authUrl = await beginGoogleOAuth(next);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start Google sign-in';
    // Redirect back to sign-in with the error surfaced so the user
    // sees a helpful message rather than a raw 500.
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('error', message);
    return NextResponse.redirect(url);
  }
}
