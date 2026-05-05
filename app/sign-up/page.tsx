/**
 * /sign-up — public account-creation surface, gated.
 *
 * In production this redirects to the landing-page waitlist anchor,
 * because GRID is closed-beta: accounts come from the waitlist, not
 * from anonymous self-service. The actual sign-up form (still useful
 * for local dev and any GRID_PUBLIC_SIGNUP=1 staging env) lives in
 * SignUpForm.tsx.
 *
 * Exception — invite tokens. A waitlist visitor can be invited via
 * /api/admin/invites, which emails them a /sign-up?invite=<token>
 * link. When the token is present and validates, we render the form
 * even with public signup off; the API consumes the token in the
 * same transaction that creates the Identity.
 *
 * Pair this with the matching gate in /api/auth/sign-up/route.ts —
 * both must agree for the closure to hold.
 */

import { redirect } from 'next/navigation';
import { isPublicSignupEnabled } from '@/lib/feature-flags';
import { validateInviteToken } from '@/lib/auth/invites';
import SignUpForm from './SignUpForm';

type Props = {
  searchParams: Promise<{ invite?: string; next?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteRaw = params.invite?.trim();

  // If a token is present, try to validate it before deciding what to
  // do. A valid token unlocks the form even when the public gate is
  // closed. An invalid token still falls through to the gate logic —
  // we don't want to show "Invalid invite" on the marketing page.
  let invite = null as Awaited<ReturnType<typeof validateInviteToken>>;
  if (inviteRaw) {
    invite = await validateInviteToken(inviteRaw);
  }

  if (!invite && !isPublicSignupEnabled()) {
    redirect('/#waitlist');
  }

  return (
    <SignUpForm
      // Invite-bound email is non-editable in the form. The API
      // re-validates so this is UX hint only, not a trust boundary.
      inviteEmail={invite?.email ?? null}
      inviteToken={invite ? inviteRaw ?? null : null}
    />
  );
}
