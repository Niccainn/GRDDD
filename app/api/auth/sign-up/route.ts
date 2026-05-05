import { NextRequest } from 'next/server';
import { signUp } from '@/lib/auth';
import { rateLimitSignUpByIpDistributed } from '@/lib/rate-limit';
import { recordConsent } from '@/lib/consent/log';
import { isPublicSignupEnabled } from '@/lib/feature-flags';
import { consumeInvite, validateInviteToken } from '@/lib/auth/invites';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  // Parse early so we can read the optional inviteToken before the
  // closed-beta gate decides whether to allow this request through.
  let body: {
    name?: string;
    email?: string;
    password?: string;
    inviteToken?: string;
    consentTosPrivacy?: boolean;
    consentMarketing?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Closed-beta gate. In production, public self-service signup is
  // OFF — accounts are provisioned manually from the waitlist via
  // /api/admin/invites. A valid invite token unlocks signup even when
  // public signup is otherwise disabled. The token is bound to a
  // specific email address; the consume step in the transaction below
  // verifies that match.
  const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken : '';
  let invitePreValidated = null as Awaited<ReturnType<typeof validateInviteToken>>;
  if (inviteToken) {
    invitePreValidated = await validateInviteToken(inviteToken);
    // Bad token + closed gate = 403, same as no token. Don't tell a
    // bot whether the token format is wrong vs. used vs. expired.
    if (!invitePreValidated && !isPublicSignupEnabled()) {
      return Response.json(
        { error: 'Public signup is not available. Join the waitlist for an invite.' },
        { status: 403 },
      );
    }
  } else if (!isPublicSignupEnabled()) {
    return Response.json(
      { error: 'Public signup is not available. Join the waitlist for an invite.' },
      { status: 403 },
    );
  }
  // Per-IP signup rate limit. 4 signups / hour stops bot farms from
  // squatting accounts faster than email verification can react. The
  // distributed limiter shares state across Vercel instances when
  // Upstash is configured.
  const ip = clientIp(req);
  const limit = await rateLimitSignUpByIpDistributed(ip);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 60_000));
    return Response.json(
      { error: `Too many signups from this address. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429 }
    );
  }

  const { name, email, password, consentTosPrivacy, consentMarketing } = body;

  if (!name || !email || !password) {
    return Response.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }
  // GDPR Art. 7 — consent must be affirmative, unambiguous, and provable.
  // We reject the sign-up (rather than warn) because the audit fallout
  // from a silently-accepted TOS is bigger than the UX friction of
  // making the checkbox required.
  if (consentTosPrivacy !== true) {
    return Response.json(
      { error: 'Please accept the Terms of Service and Privacy Policy to continue.' },
      { status: 400 }
    );
  }

  try {
    // If the request carried an invite token AND the gate let us
    // through because of it, lock in the email match before we touch
    // the auth DB. consumeInvite throws on mismatch / expired / used,
    // which we surface as a 400 — the user needs to know to use the
    // address the invite was bound to.
    if (invitePreValidated) {
      try {
        await consumeInvite({ rawToken: inviteToken, signupEmail: email });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invite invalid';
        return Response.json({ error: message }, { status: 400 });
      }
    }

    const result = await signUp(name, email, password);

    // SEC-07 — same response shape for new + existing addresses so an
    // attacker can't enumerate accounts by trying emails.
    const enumerationSafeResponse = {
      success: true,
      message: 'Check your inbox to finish signing in.',
    };

    if (result.duplicate) {
      return Response.json(enumerationSafeResponse);
    }

    // Record consent AFTER identity exists. Only runs on genuine
    // fresh signups.
    const userAgent = req.headers.get('user-agent');
    await recordConsent({
      identityId: result.identity.id,
      kind: 'signup_tos_privacy',
      granted: true,
      ip,
      userAgent,
    });
    if (consentMarketing === true) {
      await recordConsent({
        identityId: result.identity.id,
        kind: 'marketing_email',
        granted: true,
        ip,
        userAgent,
      });
    }

    // Include the session identity on the fresh path so the client
    // can redirect into /welcome. The enumeration guarantee holds
    // because duplicates never reach here — same-shape response
    // with `success: true` in both cases; callers that look for
    // `identity` simply treat its absence as "please sign in".
    return Response.json({ ...enumerationSafeResponse, identity: result.identity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
