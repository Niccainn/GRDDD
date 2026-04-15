import { describe, it, expect } from 'vitest';
import {
  isAutoSchedule,
  computeNextRunAt,
  isDue,
} from '@/lib/agents/schedule';

describe('isAutoSchedule', () => {
  it('returns false for manual', () => {
    expect(isAutoSchedule('manual')).toBe(false);
  });
  it('returns false for null/undefined', () => {
    expect(isAutoSchedule(null)).toBe(false);
    expect(isAutoSchedule(undefined)).toBe(false);
  });
  it('returns false for unknown strings', () => {
    expect(isAutoSchedule('0 9 * * *')).toBe(false);
  });
  it('returns true for valid presets', () => {
    expect(isAutoSchedule('every_15m')).toBe(true);
    expect(isAutoSchedule('every_hour')).toBe(true);
    expect(isAutoSchedule('every_4h')).toBe(true);
    expect(isAutoSchedule('daily')).toBe(true);
    expect(isAutoSchedule('weekly')).toBe(true);
  });
});

describe('computeNextRunAt', () => {
  it('returns null for manual schedule', () => {
    expect(computeNextRunAt('manual', null, new Date())).toBeNull();
  });

  it('computes from lastRunAt when available', () => {
    const lastRun = new Date('2026-01-01T10:00:00Z');
    const created = new Date('2026-01-01T00:00:00Z');
    const next = computeNextRunAt('every_hour', lastRun, created);
    expect(next).toEqual(new Date('2026-01-01T11:00:00Z'));
  });

  it('falls back to createdAt when lastRunAt is null', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const next = computeNextRunAt('daily', null, created);
    expect(next).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('maps presets to correct intervals', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    expect(computeNextRunAt('every_15m', base, base)).toEqual(new Date('2026-01-01T00:15:00Z'));
    expect(computeNextRunAt('every_4h', base, base)).toEqual(new Date('2026-01-01T04:00:00Z'));
    expect(computeNextRunAt('weekly', base, base)).toEqual(new Date('2026-01-08T00:00:00Z'));
  });
});

describe('isDue', () => {
  it('returns true when past the interval', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-01T01:01:00Z');
    expect(isDue('every_hour', null, created, now)).toBe(true);
  });

  it('returns false when before the interval', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-01T00:30:00Z');
    expect(isDue('every_hour', null, created, now)).toBe(false);
  });

  it('returns false for manual', () => {
    const now = new Date('2030-01-01T00:00:00Z');
    expect(isDue('manual', null, new Date('2020-01-01'), now)).toBe(false);
  });
});
