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
