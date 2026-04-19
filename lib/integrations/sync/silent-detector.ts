/**
 * Silent-sync detector.
 *
 * Compares the current tick's signal count per integration against
 * its 7-day rolling median. If the integration is usually chatty
 * (median >= 1 signal/day) but has produced zero signals for N
 * consecutive ticks, we treat it as "silently failed" and emit a
 * high-priority Nova signal so the user actually notices the
 * integration went dark before it affects them.
 *
 * The earlier silent-failure fix (calendar/integrations banners)
 * surfaces errors when the user visits the page. This detector
 * closes the proactive side of the loop — it surfaces silence itself
 * in the inbox, so users don't have to open each page to find out.
 *
 * Pure + deterministic: takes the raw metric inputs, returns a
 * yes/no + reason. The cron wires it to Prisma queries separately.
 */

export type IntegrationActivity = {
  integrationId: string;
  provider: string;
  displayName: string;
  environmentId: string;
  /** How many signals this integration produced in the 3 most-recent ticks. */
  recentTickSignals: number;
  /** Median daily signal count over the last 7 days. */
  median7dDailySignals: number;
  /** How many consecutive "zero" ticks so far. Persist via the caller. */
  consecutiveZeroTicks: number;
  /** Whether the user has already been alerted recently (don't spam). */
  alertedWithin24h: boolean;
};

export type DetectorResult =
  | { alert: false; reason: 'healthy' | 'quiet_by_design' | 'already_alerted' }
  | {
      alert: true;
      severity: 'warn' | 'high';
      title: string;
      body: string;
      // So the caller can persist these as part of the emitted signal
      integrationId: string;
      environmentId: string;
    };

/**
 * Decide whether the given activity window should trigger an alert.
 *
 * Rules (tight on purpose — better to miss once than to nag):
 *   1. If the 7-day median is < 1 signal/day → integration is quiet
 *      by design, skip.
 *   2. If recent 3 ticks produced signals → healthy, skip.
 *   3. If already alerted within 24h → don't duplicate.
 *   4. Escalation ladder:
 *      - 3+ consecutive zero ticks + median >= 1/day  → warn
 *      - 3+ consecutive zero ticks + median >= 5/day  → high
 */
const MIN_MEDIAN_TO_ALERT = 1; // signals per day
const ZERO_TICK_THRESHOLD = 3; // consecutive ticks
const HIGH_SEVERITY_MEDIAN = 5; // signals per day

export function detectSilentSync(activity: IntegrationActivity): DetectorResult {
  if (activity.alertedWithin24h) {
    return { alert: false, reason: 'already_alerted' };
  }
  if (activity.median7dDailySignals < MIN_MEDIAN_TO_ALERT) {
    return { alert: false, reason: 'quiet_by_design' };
  }
  if (activity.recentTickSignals > 0) {
    return { alert: false, reason: 'healthy' };
  }
  if (activity.consecutiveZeroTicks < ZERO_TICK_THRESHOLD) {
    return { alert: false, reason: 'healthy' };
  }

  const severity: 'warn' | 'high' =
    activity.median7dDailySignals >= HIGH_SEVERITY_MEDIAN ? 'high' : 'warn';
  const humanMinutes = activity.consecutiveZeroTicks * 15;
  return {
    alert: true,
    severity,
    title: `${activity.displayName} has gone quiet`,
    body:
      `${activity.displayName} usually produces ~${Math.round(activity.median7dDailySignals)} ` +
      `signals/day. Nothing has come through in the last ${humanMinutes} minutes. ` +
      `Check the connection or reconnect from /integrations.`,
    integrationId: activity.integrationId,
    environmentId: activity.environmentId,
  };
}

/**
 * Compute the median of an array of integers. Exposed for tests +
 * for callers that want to chart a provider's usual volume.
 */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
