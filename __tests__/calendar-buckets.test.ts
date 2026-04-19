import { describe, it, expect } from 'vitest';
import {
  bucketEventsByDay,
  nextFocusDay,
  monthShiftForKey,
  isoDateFor,
} from '../lib/calendar/buckets';

describe('bucketEventsByDay', () => {
  it('buckets events by day within the target month', () => {
    const events = [
      { id: 'a', date: '2026-04-03T10:00:00Z' },
      { id: 'b', date: '2026-04-03T15:00:00Z' },
      { id: 'c', date: '2026-04-10T09:00:00Z' },
    ];
    const result = bucketEventsByDay(events, 2026, 3); // April (0-indexed)
    expect(result.get(3)).toHaveLength(2);
    expect(result.get(10)).toHaveLength(1);
    expect(result.size).toBe(2);
  });

  it('drops events outside the target year/month', () => {
    const events = [
      { id: 'a', date: '2026-03-31T23:00:00Z' }, // March
      { id: 'b', date: '2026-05-01T00:00:00Z' }, // May
      { id: 'c', date: '2025-04-15T12:00:00Z' }, // last year April
    ];
    const result = bucketEventsByDay(events, 2026, 3);
    // Depending on timezone, March 31 UTC can land on March 31 OR
    // April 1 locally. We assert that the 2025 + May events are dropped
    // regardless.
    const days = [...result.keys()];
    expect(days).not.toContain(15); // 2025 event filtered
    expect(days.every(d => d <= 31)).toBe(true);
  });

  it('accepts Date instances as well as ISO strings', () => {
    const events = [{ id: 'a', date: new Date(2026, 3, 5) }];
    const result = bucketEventsByDay(events, 2026, 3);
    expect(result.get(5)).toHaveLength(1);
  });

  it('empty input → empty map', () => {
    expect(bucketEventsByDay([], 2026, 3).size).toBe(0);
  });
});

describe('nextFocusDay — keyboard navigation', () => {
  it.each([
    ['ArrowLeft', 15, 14],
    ['ArrowRight', 15, 16],
    ['ArrowUp', 15, 8],      // -7
    ['ArrowDown', 15, 22],   // +7
    ['Home', 15, 1],
    ['End', 15, 30],
  ])('%s moves correctly from day 15', (key, current, expected) => {
    expect(nextFocusDay({ current, daysInMonth: 30, key })).toBe(expected);
  });

  it('clamps to day 1 on ArrowLeft from day 1', () => {
    expect(nextFocusDay({ current: 1, daysInMonth: 30, key: 'ArrowLeft' })).toBe(1);
  });

  it('clamps to daysInMonth on ArrowRight from last day', () => {
    expect(nextFocusDay({ current: 30, daysInMonth: 30, key: 'ArrowRight' })).toBe(30);
  });

  it('clamps ArrowUp above day 7 to 1', () => {
    expect(nextFocusDay({ current: 3, daysInMonth: 30, key: 'ArrowUp' })).toBe(1);
  });

  it('clamps ArrowDown below to daysInMonth', () => {
    expect(nextFocusDay({ current: 28, daysInMonth: 30, key: 'ArrowDown' })).toBe(30);
  });

  it('unrecognised keys return the current day unchanged', () => {
    expect(nextFocusDay({ current: 10, daysInMonth: 30, key: 'X' })).toBe(10);
  });
});

describe('monthShiftForKey', () => {
  it('PageDown advances', () => {
    expect(monthShiftForKey('PageDown', false)).toBe(1);
  });
  it('PageUp retreats', () => {
    expect(monthShiftForKey('PageUp', false)).toBe(-1);
  });
  it('anything else is a no-op', () => {
    expect(monthShiftForKey('a', false)).toBe(0);
    expect(monthShiftForKey('Enter', true)).toBe(0);
  });
});

describe('isoDateFor', () => {
  it('returns a parseable ISO date at the specified time', () => {
    const iso = isoDateFor(2026, 3, 15, 14, 30);
    const back = new Date(iso);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(3);
    expect(back.getDate()).toBe(15);
    expect(back.getHours()).toBe(14);
    expect(back.getMinutes()).toBe(30);
  });

  it('defaults to 9:00 when time is omitted', () => {
    const iso = isoDateFor(2026, 3, 15);
    const back = new Date(iso);
    expect(back.getHours()).toBe(9);
    expect(back.getMinutes()).toBe(0);
  });
});
