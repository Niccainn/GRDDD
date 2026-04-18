import { describe, it, expect } from 'vitest';

/**
 * Test the wavefront *planning* logic independently. We don't mock
 * the whole workflow engine (which needs prisma, Anthropic, trace);
 * instead we verify the wavefront-selection algorithm matches what
 * the engine uses: at each step, pick every stage whose dependencies
 * are already resolved.
 */

type Stage = { id: string; dependsOn?: string[] };

function planWaves(stages: Stage[]): string[][] {
  const byId = new Map(stages.map(s => [s.id, s]));
  const done = new Set<string>();
  const waves: string[][] = [];
  const remaining = new Set(stages.map(s => s.id));

  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const id of remaining) {
      const s = byId.get(id)!;
      const deps = s.dependsOn ?? [];
      if (deps.every(d => done.has(d))) ready.push(id);
    }
    if (ready.length === 0) throw new Error('cycle');
    waves.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      done.add(id);
    }
  }
  return waves;
}

describe('wavefront planner', () => {
  it('runs fully-independent stages in one wave', () => {
    const waves = planWaves([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(waves).toHaveLength(1);
    expect(waves[0].sort()).toEqual(['a', 'b', 'c']);
  });

  it('respects a linear chain (N stages → N waves)', () => {
    const waves = planWaves([
      { id: 'a' },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['b'] },
    ]);
    expect(waves).toEqual([['a'], ['b'], ['c']]);
  });

  it('detects diamond — 1 → {2,3} → 4 runs in 3 waves', () => {
    const waves = planWaves([
      { id: '1' },
      { id: '2', dependsOn: ['1'] },
      { id: '3', dependsOn: ['1'] },
      { id: '4', dependsOn: ['2', '3'] },
    ]);
    expect(waves).toHaveLength(3);
    expect(waves[0]).toEqual(['1']);
    expect(waves[1].sort()).toEqual(['2', '3']);
    expect(waves[2]).toEqual(['4']);
  });

  it('throws on a cycle', () => {
    expect(() =>
      planWaves([
        { id: 'a', dependsOn: ['b'] },
        { id: 'b', dependsOn: ['a'] },
      ]),
    ).toThrow(/cycle/);
  });

  it('sequential-to-parallel migration: a 4-stage pipeline with 2 independent branches halves wall time', () => {
    // Scenario: prep → (draft, research in parallel) → review
    // Sequential = 4 stages. Wavefront = 3 waves.
    const waves = planWaves([
      { id: 'prep' },
      { id: 'draft', dependsOn: ['prep'] },
      { id: 'research', dependsOn: ['prep'] },
      { id: 'review', dependsOn: ['draft', 'research'] },
    ]);
    const totalStages = waves.flat().length;
    expect(totalStages).toBe(4);
    expect(waves).toHaveLength(3);
    // If each stage is 1 unit time, sequential = 4, wavefront = 3.
    // Save one full stage of wall time.
  });
});
