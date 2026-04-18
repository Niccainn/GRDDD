import { describe, it, expect } from 'vitest';
import { validateStripeKeyForTier, computeBetaTrialDays } from '../lib/billing/guardrails';

describe('validateStripeKeyForTier', () => {
  it('rejects missing key', () => {
    const r = validateStripeKeyForTier(undefined, 'closed');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(503);
  });

  describe.each(['closed', 'byok'] as const)('%s tier', tier => {
    it('rejects sk_live_*', () => {
      const r = validateStripeKeyForTier('sk_live_abc', tier);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.status).toBe(400);
        expect(r.error).toMatch(/Live Stripe keys/);
      }
    });

    it('rejects non-test keys that are not sk_live_ either', () => {
      const r = validateStripeKeyForTier('some-garbage', tier);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(500);
    });

    it('accepts sk_test_*', () => {
      const r = validateStripeKeyForTier('sk_test_abc', tier);
      expect(r.ok).toBe(true);
    });
  });

  describe('live tier', () => {
    it('accepts sk_live_*', () => {
      expect(validateStripeKeyForTier('sk_live_abc', 'live').ok).toBe(true);
    });
    it('accepts sk_test_* (staging mirror)', () => {
      expect(validateStripeKeyForTier('sk_test_abc', 'live').ok).toBe(true);
    });
  });
});

describe('computeBetaTrialDays', () => {
  it('returns undefined in live tier (real charges begin immediately)', () => {
    expect(computeBetaTrialDays('live', undefined)).toBeUndefined();
    expect(computeBetaTrialDays('live', '7')).toBeUndefined();
  });

  it('defaults to 30 days in non-live tiers when env is unset', () => {
    expect(computeBetaTrialDays('closed', undefined)).toBe(30);
    expect(computeBetaTrialDays('byok', undefined)).toBe(30);
  });

  it('respects a positive env override', () => {
    expect(computeBetaTrialDays('closed', '14')).toBe(14);
    expect(computeBetaTrialDays('byok', '90')).toBe(90);
  });

  it('falls back to the default for junk input', () => {
    for (const bad of ['', '0', '-1', 'abc', 'NaN']) {
      expect(computeBetaTrialDays('closed', bad)).toBe(30);
    }
  });

  it('floors fractional overrides so stripe sees an integer', () => {
    expect(computeBetaTrialDays('closed', '7.7')).toBe(7);
  });
});
