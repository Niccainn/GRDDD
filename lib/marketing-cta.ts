/**
 * Marketing CTA destination — single toggle for the public-facing
 * "Get started" / "Request access" button on every marketing surface
 * (pricing, access, blog, use-cases, compare).
 *
 * Why this constant exists:
 *   The CTAs have flipped between waitlist and self-serve sign-up
 *   twice already (PR #66 closed it, PR #78 opened it). Each time, a
 *   handful of pages get missed and visitors hit either a closed
 *   waitlist or a half-finished onboarding wizard. Centralising the
 *   destination here means flipping it back to /sign-up later is a
 *   one-line change instead of a sweep across ~10 files.
 *
 *   The home page (`app/page.tsx`) intentionally uses its own
 *   `#waitlist` anchor — same destination, but in-page rather than
 *   cross-page so the inline `<WaitlistForm>` can claim focus.
 *
 * Current state — request-only:
 *   The /welcome onboarding wizard isn't ready to receive cold
 *   self-serve traffic yet. Until it is, all cross-page marketing
 *   CTAs route to the waitlist anchor on the landing page. Already-
 *   signed-in users hitting /sign-up bypass the wizard via
 *   middleware (see middleware.ts:213); routing them through the
 *   waitlist instead avoids that bypass and keeps the funnel honest.
 *
 * To re-open public sign-up:
 *   Set both fields back to { href: '/sign-up', label: 'Get started' }
 *   (or whatever the open-funnel copy should be) and ship. No other
 *   files need to change.
 */

export const MARKETING_CTA = {
  href: '/#waitlist',
  label: 'Request access',
} as const;
