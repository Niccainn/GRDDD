import { describe, it, expect } from 'vitest';
import { normalizeStatus, normalizePriority } from '../lib/integrations/import/normalize';

describe('normalizeStatus', () => {
  it('defaults to TODO when missing', () => {
    expect(normalizeStatus()).toBe('TODO');
    expect(normalizeStatus('')).toBe('TODO');
  });

  it('is case-insensitive', () => {
    expect(normalizeStatus('IN PROGRESS')).toBe('IN_PROGRESS');
    expect(normalizeStatus('Done')).toBe('DONE');
  });

  it.each([
    ['not started', 'TODO'],
    ['in progress', 'IN_PROGRESS'],
    ['done', 'DONE'],
    ['completed', 'DONE'],
    ['true', 'DONE'],      // Asana completed: true
    ['false', 'TODO'],
    ['working on it', 'IN_PROGRESS'],   // Monday
    ['stuck', 'IN_PROGRESS'],
    ['backlog', 'BACKLOG'],
    ['review', 'REVIEW'],
    ['cancelled', 'CANCELLED'],
  ])('maps "%s" → %s', (input, expected) => {
    expect(normalizeStatus(input)).toBe(expected);
  });

  it('falls back to TODO for unknown values', () => {
    expect(normalizeStatus('mystery-status')).toBe('TODO');
    expect(normalizeStatus('blocked')).toBe('TODO');
  });
});

describe('normalizePriority', () => {
  it('defaults to NORMAL when missing', () => {
    expect(normalizePriority()).toBe('NORMAL');
    expect(normalizePriority('')).toBe('NORMAL');
  });

  it.each([
    ['urgent', 'URGENT'],
    ['critical', 'URGENT'],
    ['high', 'HIGH'],
    ['medium', 'NORMAL'],
    ['normal', 'NORMAL'],
    ['low', 'LOW'],
  ])('maps "%s" → %s', (input, expected) => {
    expect(normalizePriority(input)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(normalizePriority('URGENT')).toBe('URGENT');
    expect(normalizePriority('High')).toBe('HIGH');
  });

  it('falls back to NORMAL for unknown values', () => {
    expect(normalizePriority('P0')).toBe('NORMAL');
    expect(normalizePriority('important')).toBe('NORMAL');
  });
});
