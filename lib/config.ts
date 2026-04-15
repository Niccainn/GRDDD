/**
 * Runtime configuration helpers — single source of truth for which
 * tier the deployment is running in and what features are unlocked.
 *
 * GRID_BETA_TIER values:
 *
 *   'closed' (default)
 *     Invite-only private alpha. Nova runs on the platform's own
 *     Anthropic key with an aggressive daily cap per environment.
 *     Public sign-up is disabled in the UI. Used for: Nicole's own
 *     dogfooding, first ~10 design partners.
 *
 *   'byok'
 *     Public beta. Anyone can sign up, but Nova will refuse to run
 *     until the environment owner connects their own Anthropic key
 *     at /settings/ai. Zero marginal cost per user — GRID pays only
 *     for the platform (DB, hosting, email), users pay Anthropic
 *     directly for LLM usage.
 *
 *   'live'
 *     Public launch. Same as 'byok' plus planned additions:
 *       - New users get ~50 free Nova invocations using the platform
 *         key as a trial, hard-capped to protect worst-case spend
 *       - Stripe integration for optional platform subscription
 *       - SSO, audit log exports, enterprise features unlock
 *     This tier is not yet active — see docs/PRODUCT_SYNC.md for the
 *     activation checklist.
 *
 * Changing tiers is a single env var change with no code deploy
 * required — the resolver in lib/nova/client-factory.ts reads the
 * tier at each Nova invocation. Flipping from 'closed' to 'byok' is
 * the private-beta → public-beta promotion path.
 */

export type BetaTier = 'closed' | 'byok' | 'live';

const VALID_TIERS: readonly BetaTier[] = ['closed', 'byok', 'live'] as const;

/**
 * Read the active beta tier. Defaults to 'closed' so a new
 * deployment is always invite-only until explicitly opened up.
 */
export function getBetaTier(): BetaTier {
  const raw = (process.env.GRID_BETA_TIER ?? 'closed').toLowerCase().trim() as BetaTier;
  return VALID_TIERS.includes(raw) ? raw : 'closed';
}

/**
 * Whether the platform should allow sign-up from the public sign-up
 * page. In closed beta we hide the form and show a "request access"
 * CTA instead. In byok + live the form is live.
 */
export function isPublicSignupAllowed(): boolean {
  return getBetaTier() !== 'closed';
}

/**
 * Whether the tier requires the tenant to have supplied their own
 * Anthropic key before Nova will run. True for byok + live, false
 * for closed (which falls back to the platform key).
 */
export function requiresByokKey(): boolean {
  return getBetaTier() !== 'closed';
}

/**
 * Upper bound on tokens per environment per day while running on
 * the platform's Anthropic key. This is the fail-safe for closed
 * beta and for the planned trial mode in 'live'. Defaults to
 * ~150K tokens/day which at Sonnet 4.6 pricing caps worst-case
 * exposure around $2.50/day/environment.
 */
export function getPlatformKeyDailyCap(): number {
  const raw = Number(process.env.GRID_PLATFORM_DAILY_CAP_TOKENS);
  if (!Number.isFinite(raw) || raw <= 0) return 150_000;
  return raw;
}
