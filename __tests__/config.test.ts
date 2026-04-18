import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBetaTier,
  isPublicSignupAllowed,
  requiresByokKey,
  getPlatformKeyDailyCap,
} from '../lib/config';

/**
 * Tier resolution is load-bearing for the BYOK rollout. If getBetaTier
 * ever silently returns a different default (e.g. 'live' instead of
 * 'closed') we'd open public sign-up on a fresh deploy by accident —
 * these tests are the guardrail.
 */

const KEY = 'GRID_BETA_TIER';
const CAP = 'GRID_PLATFORM_DAILY_CAP_TOKENS';

let originalTier: string | undefined;
let originalCap: string | undefined;

beforeEach(() => {
  originalTier = process.env[KEY];
  originalCap = process.env[CAP];
  delete process.env[KEY];
  delete process.env[CAP];
});

afterEach(() => {
  if (originalTier === undefined) delete process.env[KEY];
  else process.env[KEY] = originalTier;
  if (originalCap === undefined) delete process.env[CAP];
  else process.env[CAP] = originalCap;
});

describe('getBetaTier', () => {
  it('defaults to "closed" when unset', () => {
    expect(getBetaTier()).toBe('closed');
  });

  it('accepts each valid tier', () => {
    for (const t of ['closed', 'byok', 'live'] as const) {
      process.env[KEY] = t;
      expect(getBetaTier()).toBe(t);
    }
  });

  it('is case-insensitive and trims whitespace', () => {
    process.env[KEY] = '  LIVE  ';
    expect(getBetaTier()).toBe('live');
    process.env[KEY] = 'Byok';
    expect(getBetaTier()).toBe('byok');
  });

  it('falls back to "closed" on unknown value', () => {
    process.env[KEY] = 'production';
    expect(getBetaTier()).toBe('closed');
    process.env[KEY] = '';
    expect(getBetaTier()).toBe('closed');
  });
});

describe('isPublicSignupAllowed', () => {
  it('is false in closed tier', () => {
    process.env[KEY] = 'closed';
    expect(isPublicSignupAllowed()).toBe(false);
  });

  it.each(['byok', 'live'])('is true in %s tier', tier => {
    process.env[KEY] = tier;
    expect(isPublicSignupAllowed()).toBe(true);
  });
});

describe('requiresByokKey', () => {
  it('is false only in closed tier', () => {
    process.env[KEY] = 'closed';
    expect(requiresByokKey()).toBe(false);
  });

  it.each(['byok', 'live'])('is true in %s tier', tier => {
    process.env[KEY] = tier;
    expect(requiresByokKey()).toBe(true);
  });
});

describe('getPlatformKeyDailyCap', () => {
  it('defaults to 150_000 tokens/day when unset', () => {
    expect(getPlatformKeyDailyCap()).toBe(150_000);
  });

  it('respects a valid positive number', () => {
    process.env[CAP] = '50000';
    expect(getPlatformKeyDailyCap()).toBe(50_000);
  });

  it('falls back to default on invalid input', () => {
    for (const bad of ['abc', '-1', '0', '', 'NaN']) {
      process.env[CAP] = bad;
      expect(getPlatformKeyDailyCap()).toBe(150_000);
    }
  });
});
