/**
 * Billing guardrails.
 *
 * Small pure helpers extracted from the checkout route so the safety
 * rules ("no live keys in beta", "trial period captures card only")
 * are unit-testable without booting Stripe or Prisma.
 *
 * If you change any rule here, update __tests__/billing-guardrails.test.ts.
 */

import type { BetaTier } from '../config';

export type StripeGuardResult =
  | { ok: true; tier: BetaTier }
  | { ok: false; status: number; error: string };

/**
 * Validates the configured Stripe key against the current tier.
 *
 * Rules:
 *   - closed / byok → sk_test_* only (live keys refused hard)
 *   - live          → any key; sk_live_ expected, sk_test_ still allowed
 *                     for staging mirrors of the live tier.
 *   - empty key     → caller's concern (route returns 503 separately).
 */
export function validateStripeKeyForTier(
  secretKey: string | undefined,
  tier: BetaTier,
): StripeGuardResult {
  if (!secretKey) {
    return { ok: false, status: 503, error: 'Billing not configured.' };
  }
  if (tier !== 'live' && secretKey.startsWith('sk_live_')) {
    return {
      ok: false,
      status: 400,
      error: 'Live Stripe keys are only permitted in the live tier. Use sk_test_* during beta.',
    };
  }
  if (tier !== 'live' && !secretKey.startsWith('sk_test_')) {
    return {
      ok: false,
      status: 500,
      error: 'STRIPE_SECRET_KEY must be a sk_test_* key during beta tiers.',
    };
  }
  return { ok: true, tier };
}

/**
 * Compute the trial-period length for a new subscription. In live tier
 * we return undefined (charge starts immediately per the price). In
 * any non-live tier we ALWAYS return a positive number — even if the
 * env var is unset — so captured cards don't become charges by
 * accident during beta.
 */
export function computeBetaTrialDays(
  tier: BetaTier,
  envOverride: string | undefined,
  defaultDays = 30,
): number | undefined {
  if (tier === 'live') return undefined;
  const n = Number(envOverride);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return defaultDays;
}
