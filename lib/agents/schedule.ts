/**
 * Agent scheduling — minimal preset interval scheduler.
 *
 * The goal of v1 is "fire-and-forget on a heartbeat" without pulling
 * in a cron parser. Agents store one of a small set of preset strings
 * in `Agent.schedule`; this module maps each preset to a millisecond
 * interval, computes the next due time relative to lastRunAt, and the
 * worker route picks up everything that's overdue.
 *
 * Adding a real cron parser (vixie-style "0 9 * * *" expressions) is
 * a v2 follow-up — at that point this file gains a parseCron() helper
 * but the call surface stays the same.
 */

export const SCHEDULE_PRESETS = [
  'manual',
  'every_15m',
  'every_hour',
  'every_4h',
  'daily',
  'weekly',
] as const;

export type SchedulePreset = (typeof SCHEDULE_PRESETS)[number];

const INTERVAL_MS: Record<Exclude<SchedulePreset, 'manual'>, number> = {
  every_15m: 15 * 60 * 1000,
  every_hour: 60 * 60 * 1000,
  every_4h: 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * True if `schedule` is a recognized non-manual preset that the cron
 * worker should evaluate. Unknown strings + null + "manual" all return
 * false so a misconfigured agent simply doesn't auto-run.
 */
export function isAutoSchedule(schedule: string | null | undefined): boolean {
  if (!schedule || schedule === 'manual') return false;
  return (SCHEDULE_PRESETS as readonly string[]).includes(schedule) && schedule !== 'manual';
}

/**
 * Compute the next-due timestamp for an agent based on its preset and
 * the timestamp of its most recent run (or creation time for agents
 * that have never been run). Returns null when the schedule is manual
 * or unrecognized so callers can early-return.
 */
export function computeNextRunAt(
  schedule: string | null | undefined,
  lastRunAt: Date | null,
  createdAt: Date,
): Date | null {
  if (!isAutoSchedule(schedule)) return null;
  const intervalMs = INTERVAL_MS[schedule as Exclude<SchedulePreset, 'manual'>];
  if (!intervalMs) return null;
  const baseline = (lastRunAt ?? createdAt).getTime();
  return new Date(baseline + intervalMs);
}

/**
 * Returns true when the agent is overdue for an automatic run as of
 * `now`. Agents with manual schedules always return false.
 */
export function isDue(
  schedule: string | null | undefined,
  lastRunAt: Date | null,
  createdAt: Date,
  now: Date = new Date(),
): boolean {
  const next = computeNextRunAt(schedule, lastRunAt, createdAt);
  if (!next) return false;
  return next.getTime() <= now.getTime();
}
