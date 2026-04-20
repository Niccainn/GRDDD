/**
 * /onboarding — legacy route, redirected to /welcome.
 *
 * We used to have two onboarding flows: /onboarding (755-line
 * client-side wizard writing only to localStorage) and /welcome
 * (the real flow writing DB + cookie + seeding Environment). They
 * diverged over time and became a UX trap — the dashboard's
 * "finish your setup" nudge linked here, but completing this wizard
 * didn't actually onboard the user server-side.
 *
 * /welcome is canonical. This route is now a permanent redirect so
 * any stale bookmarks or old in-app links keep working.
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

export default function OnboardingRedirect() {
  redirect('/welcome');
}
