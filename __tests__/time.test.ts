import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  relativeTime,
  formatDuration,
  parseDuration,
  minutesToDecimal,
} from '../lib/time';

describe('relativeTime', () => {
  beforeEach(() => {
    // Freeze "now" at a stable anchor so assertions don't flake.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('returns "just now" for <60s', () => {
    expect(relativeTime(ago(0))).toBe('just now');
    expect(relativeTime(ago(30_000))).toBe('just now');
  });

  it('minutes under an hour', () => {
    expect(relativeTime(ago(60_000))).toBe('1m ago');
    expect(relativeTime(ago(45 * 60_000))).toBe('45m ago');
  });

  it('hours under a day', () => {
    expect(relativeTime(ago(3600_000))).toBe('1h ago');
    expect(relativeTime(ago(23 * 3600_000))).toBe('23h ago');
  });

  it('"yesterday" at exactly 1 day', () => {
    expect(relativeTime(ago(24 * 3600_000))).toBe('yesterday');
  });

  it('days under a week', () => {
    expect(relativeTime(ago(3 * 86_400_000))).toBe('3d ago');
  });

  it('falls back to short date after 7+ days', () => {
    const d = new Date('2026-01-15T10:00:00Z');
    expect(relativeTime(d.toISOString())).toMatch(/^Jan 1[45]$/);
  });

  it('accepts Date and string inputs', () => {
    const iso = ago(300_000);
    expect(relativeTime(iso)).toBe(relativeTime(new Date(iso)));
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [-5, '0m'],
    [1, '1m'],
    [45, '45m'],
    [60, '1h'],
    [90, '1h 30m'],
    [150, '2h 30m'],
    [480, '8h'],
  ])('formatDuration(%i) → %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('parseDuration', () => {
  it.each([
    ['2h 30m', 150],
    ['2h30m', 150],
    ['45m', 45],
    ['2h', 120],
    ['2:30', 150],
    ['0:15', 15],
    ['2.5', 150],
    ['1.25', 75],
    ['', 0],
    ['garbage', 0],
  ])('parseDuration(%j) → %i', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it('trims whitespace', () => {
    expect(parseDuration('  2h 30m  ')).toBe(150);
  });
});

describe('minutesToDecimal', () => {
  it.each([
    [0, '0.00'],
    [15, '0.25'],
    [45, '0.75'],
    [60, '1.00'],
    [150, '2.50'],
  ])('minutesToDecimal(%i) → %s', (input, expected) => {
    expect(minutesToDecimal(input)).toBe(expected);
  });
});
