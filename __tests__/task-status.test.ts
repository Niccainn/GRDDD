import { describe, it, expect } from 'vitest';

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const;
const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const;

describe('Task constants', () => {
  it('has valid status values', () => {
    expect(STATUSES).toHaveLength(6);
    expect(STATUSES).toContain('TODO');
    expect(STATUSES).toContain('IN_PROGRESS');
    expect(STATUSES).toContain('DONE');
  });

  it('has valid priority values', () => {
    expect(PRIORITIES).toHaveLength(4);
    expect(PRIORITIES).toContain('URGENT');
    expect(PRIORITIES).toContain('NORMAL');
  });

  it('board columns exclude CANCELLED', () => {
    const boardColumns = STATUSES.filter(s => s !== 'CANCELLED');
    expect(boardColumns).toHaveLength(5);
    expect(boardColumns).not.toContain('CANCELLED');
  });

  it('position sort is stable', () => {
    const tasks = [
      { id: 'a', position: 2000, createdAt: '2026-01-02' },
      { id: 'b', position: 1000, createdAt: '2026-01-03' },
      { id: 'c', position: 1000, createdAt: '2026-01-01' },
    ];
    const sorted = [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    expect(sorted.map(t => t.id)).toEqual(['c', 'b', 'a']);
  });
});
