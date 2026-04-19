/**
 * Calendar event bucketing + grid math.
 *
 * Pure functions exposed for unit tests and for the Calendar page. The
 * page currently recomputed `eventsForDay(day)` on every render by
 * filtering the whole event list — O(daysInMonth × events) per paint.
 * With bucketEventsByDay() we pay that cost once per (events, month)
 * change via useMemo, then index O(1) per cell.
 */

export type DatedEvent = { date: string | Date };

/**
 * Bucket an event list into a Map keyed by day-of-month for a given
 * year/month. Events outside the target month are discarded.
 */
export function bucketEventsByDay<T extends DatedEvent>(
  events: T[],
  year: number,
  month: number,
): Map<number, T[]> {
  const bucket = new Map<number, T[]>();
  for (const ev of events) {
    const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    const arr = bucket.get(day);
    if (arr) arr.push(ev);
    else bucket.set(day, [ev]);
  }
  return bucket;
}

/**
 * Keyboard navigation reducer for a 7-column calendar grid. Given the
 * current focused-day index (1..daysInMonth) and a key, returns the
 * next index — clamped to the visible month. Exposed as a pure fn so
 * the tests can exercise every edge without mounting React.
 */
export function nextFocusDay(params: {
  current: number;
  daysInMonth: number;
  key: string;
}): number {
  const { current, daysInMonth, key } = params;
  switch (key) {
    case 'ArrowLeft':
      return Math.max(1, current - 1);
    case 'ArrowRight':
      return Math.min(daysInMonth, current + 1);
    case 'ArrowUp':
      return Math.max(1, current - 7);
    case 'ArrowDown':
      return Math.min(daysInMonth, current + 7);
    case 'Home':
      return 1;
    case 'End':
      return daysInMonth;
    default:
      return current;
  }
}

/**
 * Does this key trigger a "move to next month" action? PageDown next,
 * PageUp previous — mirrors Google Calendar conventions. Meta+Home
 * jumps to today (handled in the component via state).
 */
export function monthShiftForKey(key: string, shift: boolean): -1 | 0 | 1 {
  if (key === 'PageDown' || (shift && key === 'ArrowRight' && false)) return 1;
  if (key === 'PageUp') return -1;
  return 0;
}

/**
 * Return an ISO date string for a given year/month/day at local midnight.
 * Used by the quick-add form to build the task's dueDate without pulling
 * in a date library.
 */
export function isoDateFor(year: number, month: number, day: number, hour = 9, minute = 0): string {
  const d = new Date(year, month, day, hour, minute, 0, 0);
  return d.toISOString();
}
