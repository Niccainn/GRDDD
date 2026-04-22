/**
 * Goal → dollar attribution.
 *
 * Zero-migration approach: we don't add new fields to Goal. Instead
 * we parse the existing metric / target / current strings with a
 * lightweight heuristic and emit a best-effort dollar value.
 *
 * The heuristic tiers, highest priority first:
 *   1. metric contains "$", "dollar", "revenue", "arr", "mrr"
 *        → current value is itself in dollars
 *   2. metric contains "hour", "time saved", "labor"
 *        → multiply by loaded hourly cost ($85/hr default, overridable)
 *   3. metric contains "day", "week"
 *        → convert to hours via a rough calendar rate, then × hourly
 *   4. fallthrough — emit 0 and flag attributed: false
 *
 * The function returns both the estimate and the confidence so the
 * widget can surface how uncertain the number is.
 */

const DEFAULT_HOURLY_USD = 85;
const WORKING_HOURS_PER_DAY = 8;
const WORKING_DAYS_PER_WEEK = 5;

export type GoalValue = {
  dollars: number;
  confidence: number; // 0..1
  attributed: boolean;
  method: 'direct' | 'hours' | 'days' | 'weeks' | 'none';
  note: string;
};

export function parseNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[,$]/g, '').trim();
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function estimateGoalValue(
  goal: { metric: string | null; current: string | null; target: string | null },
  opts: { hourlyUsd?: number } = {},
): GoalValue {
  const hourly = opts.hourlyUsd ?? DEFAULT_HOURLY_USD;
  const metric = (goal.metric ?? '').toLowerCase();
  const current = parseNumber(goal.current ?? goal.target);

  if (current == null) {
    return {
      dollars: 0,
      confidence: 0,
      attributed: false,
      method: 'none',
      note: 'No parseable value on this Goal.',
    };
  }

  if (/[$]|dollar|revenue|arr|mrr|cost saved|savings/.test(metric)) {
    return {
      dollars: current,
      confidence: 0.9,
      attributed: true,
      method: 'direct',
      note: 'Metric is already in dollars.',
    };
  }
  if (/hour|hrs|time saved|labor/.test(metric)) {
    return {
      dollars: Math.round(current * hourly),
      confidence: 0.7,
      attributed: true,
      method: 'hours',
      note: `Loaded at $${hourly}/hr (editable per workspace).`,
    };
  }
  if (/week/.test(metric)) {
    return {
      dollars: Math.round(current * WORKING_DAYS_PER_WEEK * WORKING_HOURS_PER_DAY * hourly),
      confidence: 0.5,
      attributed: true,
      method: 'weeks',
      note: `Converted from weeks at ${WORKING_DAYS_PER_WEEK} days × ${WORKING_HOURS_PER_DAY} hrs × $${hourly}/hr.`,
    };
  }
  if (/day/.test(metric)) {
    return {
      dollars: Math.round(current * WORKING_HOURS_PER_DAY * hourly),
      confidence: 0.55,
      attributed: true,
      method: 'days',
      note: `Converted from days at ${WORKING_HOURS_PER_DAY} hrs × $${hourly}/hr.`,
    };
  }
  return {
    dollars: 0,
    confidence: 0,
    attributed: false,
    method: 'none',
    note: 'Metric unit could not be inferred. Add $ or "hours" to the Goal metric label to attribute.',
  };
}
