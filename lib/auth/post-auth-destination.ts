/**
 * Single source of truth for "where does an authenticated user go?"
 *
 * Why this module exists:
 *   The "where to send the user" decision was scattered across three
 *   places before this consolidation:
 *
 *     1. middleware.ts — when a signed-in user hits /sign-in or
 *        /sign-up, where to bounce them to.
 *     2. app/sign-in/page.tsx — after a successful sign-in, where to
 *        push the router to.
 *     3. app/api/auth/oauth/<provider>/callback/route.ts — after an
 *        OAuth code exchange, where to NextResponse.redirect to.
 *
 *   Plus a now-deleted client-side <DashboardEnvironmentRedirect />
 *   that ran on /dashboard mount.
 *
 *   Each one had subtly different rules. PRs #31, #37, #40, #43 were
 *   all the same conceptual fix — change the destination — applied to
 *   one site at a time, missing the others. Four PRs to converge on a
 *   single user-visible behavior.
 *
 *   This module collapses the decision into one pure function so all
 *   the call sites stay in sync by construction.
 *
 * The rules (in order):
 *   1. If the user hasn't completed onboarding → /welcome. This is
 *      non-bypassable. Even if a `next=` param is set (deep link,
 *      bookmark from a prior session), we still send them through
 *      the wizard first so they have an env + system to land into.
 *      Matches the existing behavior in google/callback.
 *   2. If `next` is a safe relative path → honor it. OAuth callbacks
 *      pass the original sign-in page's `next` here; deep-linked
 *      sign-ins land where the user intended.
 *   3. Otherwise → /dashboard. The cross-environment home is the
 *      canonical landing (see PR #40 for the rationale).
 *
 * What this *doesn't* do:
 *   - No env-first redirect. `/environments/<slug>` is reachable
 *     from the sidebar one click away from /dashboard. Earlier
 *     behavior auto-bounced /dashboard → /environments/<slug> and
 *     buried the home page; we explicitly don't repeat that.
 */

export type PostAuthOptions = {
  /** The `?next=` param if any. Honored as-is when set. */
  next?: string | null;
  /** True if the user has completed the /welcome wizard. Source of
   *  truth is `Identity.onboardedAt`; the `grid_onboarded` cookie
   *  caches this for middleware fast-path. */
  onboarded: boolean;
};

/**
 * Returns the path an authenticated user should land on. Pure,
 * stateless — caller passes in everything it knows.
 *
 *   getPostAuthDestination({ next: searchParams.get('next'), onboarded })
 *
 * Caller is responsible for resolving the `onboarded` value. Server
 * code (middleware, OAuth callback) reads `grid_onboarded` cookie.
 * Client code (sign-in handler) gets it from the auth response.
 */
export function getPostAuthDestination(opts: PostAuthOptions): string {
  // 1. Onboarding gate. Non-bypassable — even a `next=` deep link
  //    won't skip the wizard. Users without an env/system who land
  //    deep in the app see broken-looking empty states; the wizard
  //    is short and gives them something to land into.
  if (!opts.onboarded) {
    return '/welcome';
  }

  // 2. Explicit ?next= override. Validate it's a safe relative path
  //    to prevent open-redirect attacks — if someone passes
  //    `?next=https://evil.com` or `?next=//evil.com`, fall through
  //    to /dashboard.
  const next = opts.next?.trim();
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  // 3. Default: cross-environment home. Don't auto-redirect to the
  //    user's first env — see lib comment above + PR #40.
  return '/dashboard';
}
