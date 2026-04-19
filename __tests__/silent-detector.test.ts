import { describe, it, expect } from 'vitest';
import { detectSilentSync, median } from '../lib/integrations/sync/silent-detector';

/**
 * Dedupe + threshold rules are the whole contract of this module.
 * If any of these flip, the inbox will either spam users or miss a
 * dark integration — both are high-stakes regressions.
 */

const baseActivity = {
  integrationId: 'int_1',
  provider: 'notion',
  displayName: 'Notion',
  environmentId: 'env_1',
  recentTickSignals: 0,
  median7dDailySignals: 3,
  consecutiveZeroTicks: 4,
  alertedWithin24h: false,
};

describe('median', () => {
  it('returns 0 for empty input (prevents div-by-zero upstream)', () => {
    expect(median([])).toBe(0);
  });
  it.each([
    [[5], 5],
    [[1, 2, 3], 2],
    [[1, 3, 3, 6, 7, 8, 9], 6],
    [[1, 2, 3, 4], 2.5],
  ])('median(%j) → %f', (input, expected) => {
    expect(median(input)).toBe(expected);
  });
  it('does not mutate the input array', () => {
    const a = [3, 1, 2];
    median(a);
    expect(a).toEqual([3, 1, 2]);
  });
});

describe('detectSilentSync — decision rules', () => {
  it('alerts with warn severity at the default threshold', () => {
    const r = detectSilentSync(baseActivity);
    expect(r.alert).toBe(true);
    if (r.alert) {
      expect(r.severity).toBe('warn');
      expect(r.title).toMatch(/has gone quiet/i);
      expect(r.body).toMatch(/Notion usually produces/);
      expect(r.body).toMatch(/last \d+ minutes/);
    }
  });

  it('escalates to high severity when median >= 5/day', () => {
    const r = detectSilentSync({ ...baseActivity, median7dDailySignals: 10 });
    expect(r.alert).toBe(true);
    if (r.alert) expect(r.severity).toBe('high');
  });

  it('does NOT alert if the integration is quiet by design (median < 1/day)', () => {
    const r = detectSilentSync({ ...baseActivity, median7dDailySignals: 0.5 });
    expect(r.alert).toBe(false);
    if (!r.alert) expect(r.reason).toBe('quiet_by_design');
  });

  it('does NOT alert if recent ticks produced signals', () => {
    const r = detectSilentSync({ ...baseActivity, recentTickSignals: 2 });
    expect(r.alert).toBe(false);
    if (!r.alert) expect(r.reason).toBe('healthy');
  });

  it('does NOT alert if consecutiveZeroTicks is below threshold', () => {
    const r = detectSilentSync({ ...baseActivity, consecutiveZeroTicks: 2 });
    expect(r.alert).toBe(false);
    if (!r.alert) expect(r.reason).toBe('healthy');
  });

  it('respects the 24h dedupe gate (no double-alerting)', () => {
    const r = detectSilentSync({ ...baseActivity, alertedWithin24h: true });
    expect(r.alert).toBe(false);
    if (!r.alert) expect(r.reason).toBe('already_alerted');
  });

  it('carries integration context through to the output for persistence', () => {
    const r = detectSilentSync(baseActivity);
    expect(r.alert).toBe(true);
    if (r.alert) {
      expect(r.integrationId).toBe('int_1');
      expect(r.environmentId).toBe('env_1');
    }
  });
});
