/**
 * /sign-up — public account-creation surface, gated.
 *
 * In production this redirects to the landing page waitlist
 * anchor, because GRID is closed-beta: accounts come from the
 * waitlist, not from anonymous self-service. The actual sign-up
 * form (still useful for local dev and any GRID_PUBLIC_SIGNUP=1
 * staging env) lives in SignUpForm.tsx.
 *
 * Pair this with the matching gate in /api/auth/sign-up/route.ts
 * — both must be off in prod for the closure to hold.
 */

import { redirect } from 'next/navigation';
import { isPublicSignupEnabled } from '@/lib/feature-flags';
import SignUpForm from './SignUpForm';

export default function SignUpPage() {
  if (!isPublicSignupEnabled()) {
    // Hash anchor lands the visitor on the waitlist form on the
    // marketing page. Server-side redirect — no flash of the
    // sign-up form.
    redirect('/#waitlist');
  }
  return <SignUpForm />;
}
