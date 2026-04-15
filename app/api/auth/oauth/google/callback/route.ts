/**
 * GET /api/auth/oauth/google/callback
 *
 * Google redirects the user here after consent. Validates state,
 * exchanges the code, upserts the Identity, mints a session cookie,
 * and redirects to the original `next` URL (or /welcome for new
 * accounts so they run the onboarding wizard).
 *
 * Public route — whitelisted in middleware under /api/auth/oauth.
 */
import { NextResponse } from 'next/server';
import { completeGoogleOAuth, upsertGoogleIdentity } from '@/lib/auth/google';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const googleError = url.searchParams.get('error');

  // User declined consent or Google itself reported an error.
  if (googleError) {
    const dest = new URL('/sign-in', req.url);
    dest.searchParams.set(
      'error',
      googleError === 'access_denied'
        ? 'Google sign-in was cancelled.'
        : `Google returned an error: ${googleError}`,
    );
    return NextResponse.redirect(dest);
  }

  if (!code || !state) {
    const dest = new URL('/sign-in', req.url);
    dest.searchParams.set('error', 'Missing OAuth response. Please try again.');
    return NextResponse.redirect(dest);
  }

  try {
    const { user, next } = await completeGoogleOAuth(code, state);
    const { id: identityId, isNew } = await upsertGoogleIdentity(user);

    await createSession(identityId);

    // New accounts always go through /welcome so we can collect
    // workspace details. Returning users honor the `next` from the
    // original sign-in page so they land where they intended.
    // We also route returning users who haven't finished onboarding
    // (e.g. closed the tab mid-wizard) back to /welcome.
    let destinationPath = next;
    let isOnboarded = false;
    if (isNew) {
      destinationPath = '/welcome';
    } else {
      const identity = await prisma.identity.findUnique({
        where: { id: identityId },
        select: { onboardedAt: true },
      });
      if (!identity?.onboardedAt) {
        destinationPath = '/welcome';
      } else {
        isOnboarded = true;
      }
    }

    const response = NextResponse.redirect(new URL(destinationPath, req.url));
    if (isOnboarded) {
      response.cookies.set('grid_onboarded', '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed';
    const dest = new URL('/sign-in', req.url);
    dest.searchParams.set('error', message);
    return NextResponse.redirect(dest);
  }
}
