/**
 * Feature flags — centralised runtime toggles.
 *
 * Every gate that changes behavior between dev and prod (or between
 * rollout cohorts) lives here. Having one file means a security review
 * only needs to audit one surface to know what is public and what is
 * locked down.
 */

/**
 * Is the one-click "Continue with demo workspace" sign-in available?
 *
 * Disabled by default in production. Can be force-enabled via
 * GRID_ENABLE_DEMO=1 for a staging environment that wants demo access.
 * NEVER set this in the real production environment: demo sandboxes
 * bypass email verification and create throwaway Identities on demand,
 * which is a spam and data-leak vector if exposed to the public.
 */
export function isDemoEnabled(): boolean {
  if (process.env.GRID_ENABLE_DEMO === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

/**
 * Is unauthenticated email/password account creation available?
 *
 * In production, defaults to **false** — there is no path into the app
 * for someone without an explicit invite. The marketing site collects
 * waitlist emails; we provision accounts manually (or via a future
 * invite flow) and the recipient signs in via OAuth or a password they
 * set on first login.
 *
 * Force-enable with GRID_PUBLIC_SIGNUP=1 if you need self-service
 * onboarding (closed beta with a known cohort, internal testing, etc.).
 *
 * NEVER set this in real production — it removes the only barrier
 * between the marketing site and the multi-tenant app, and creates a
 * spam / data-leak vector at /sign-up.
 */
export function isPublicSignupEnabled(): boolean {
  if (process.env.GRID_PUBLIC_SIGNUP === '1') return true;
  return process.env.NODE_ENV !== 'production';
}
