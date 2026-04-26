/**
 * OAuth callback — GET /api/auth/oauth/:provider/callback
 *
 * Provider has redirected the user back with ?code and ?state.
 * We verify the state, exchange the code for a token, fetch the
 * profile, upsert the Identity (linking by email if an account
 * already exists), create a GRID session cookie, and send the
 * user to the dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getProvider,
  callbackUrl,
  exchangeCode,
  fetchProfile,
} from '@/lib/oauth';
import { upsertOAuthIdentity, createSessionForIdentity } from '@/lib/auth';
import { getPostAuthDestination } from '@/lib/auth/post-auth-destination';

const STATE_COOKIE_PREFIX = 'grid_oauth_state_';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);
  const url = new URL(req.url);

  function fail(reason: string) {
    const redirect = new URL('/sign-in', req.url);
    redirect.searchParams.set('error', reason);
    return NextResponse.redirect(redirect);
  }

  if (!provider) return fail(`${providerId}_not_configured`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return fail('oauth_missing_code');

  const expectedState = req.cookies.get(`${STATE_COOKIE_PREFIX}${providerId}`)?.value;
  if (!expectedState || expectedState !== state) return fail('oauth_state_mismatch');

  try {
    const redirectUri = callbackUrl(url.origin, providerId);
    const accessToken = await exchangeCode(provider, code, redirectUri);
    const profile = await fetchProfile(provider, accessToken);

    const identity = await upsertOAuthIdentity({
      provider: providerId,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    });

    await createSessionForIdentity(identity.id);

    // Single source of truth — see lib/auth/post-auth-destination.
    // Honors ?next= override, routes un-onboarded users to /welcome,
    // otherwise lands on /dashboard.
    const dest = getPostAuthDestination({
      next: url.searchParams.get('next'),
      onboarded: Boolean(identity.onboardedAt),
    });
    const res = NextResponse.redirect(new URL(dest, req.url));
    res.cookies.delete(`${STATE_COOKIE_PREFIX}${providerId}`);
    return res;
  } catch (err) {
    console.error('[oauth.callback]', providerId, err);
    return fail('oauth_exchange_failed');
  }
}
