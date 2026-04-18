import { describe, it, expect } from 'vitest';
import { summarizeScaffoldFeedback, renderPriorCorrections } from '../lib/scaffold/feedback';
import type { ScaffoldSpec } from '../lib/scaffold/spec';

const minSpec = (overrides: Partial<ScaffoldSpec> = {}): ScaffoldSpec => ({
  summary: 'test',
  systems: [{ name: 'A', description: 'x' } as never],
  workflows: [],
  signals: [],
  widgets: [],
  roles: [],
  integrations: [],
  ...overrides,
});

describe('summarizeScaffoldFeedback', () => {
  it('returns an "accepted unchanged" insight when no original is passed', () => {
    const r = summarizeScaffoldFeedback(undefined, minSpec(), 'a prompt');
    expect(r).not.toBeNull();
    expect(r!.strength).toBeLessThan(0.7);
    expect(r!.principle).toMatch(/accepted unchanged/i);
  });

  it('reports added systems in the principle', () => {
    const orig = minSpec();
    const accepted = minSpec({
      systems: [
        { name: 'A', description: 'x' },
        { name: 'Marketing', description: 'y' },
      ] as never[],
    });
    const r = summarizeScaffoldFeedback(orig, accepted, 'desc');
    expect(r!.principle).toMatch(/added systems: Marketing/);
    expect(r!.strength).toBeGreaterThan(0.4);
  });

  it('reports removed systems', () => {
    const orig = minSpec({
      systems: [
        { name: 'A', description: 'x' },
        { name: 'DeleteMe', description: 'y' },
      ] as never[],
    });
    const accepted = minSpec();
    const r = summarizeScaffoldFeedback(orig, accepted, null);
    expect(r!.principle).toMatch(/removed systems: DeleteMe/);
  });

  it('reports workflow count drift', () => {
    const orig = minSpec();
    const accepted = minSpec({
      workflows: [
        {
          name: 'W',
          systemName: 'A',
          stages: [{ id: 's', name: 'S', instruction: 'x' }],
        },
      ] as never[],
    });
    const r = summarizeScaffoldFeedback(orig, accepted, null);
    expect(r!.principle).toMatch(/workflow count went 0 → 1/);
  });

  it('caps strength at 0.95 no matter how many diffs', () => {
    const orig = minSpec({
      systems: Array.from({ length: 5 }, (_, i) => ({ name: `Old${i}`, description: 'x' })) as never[],
      widgets: [{ widget: 'AttentionWidget', order: 0 }] as never[],
    });
    const accepted = minSpec({
      systems: Array.from({ length: 5 }, (_, i) => ({ name: `New${i}`, description: 'x' })) as never[],
      workflows: [
        { name: 'A', systemName: 'New0', stages: [{ id: 'a', name: 'a', instruction: 'x' }] },
      ] as never[],
      widgets: [{ widget: 'GoalsWidget', order: 0 }] as never[],
    });
    const r = summarizeScaffoldFeedback(orig, accepted, null);
    expect(r!.strength).toBeLessThanOrEqual(0.95);
  });
});

describe('renderPriorCorrections', () => {
  it('returns empty string for no insights', () => {
    expect(renderPriorCorrections([])).toBe('');
  });

  it('sorts by strength desc', () => {
    const out = renderPriorCorrections([
      { principle: 'weak', strength: 0.2, createdAt: new Date('2026-01-01') },
      { principle: 'strong', strength: 0.9, createdAt: new Date('2026-01-02') },
    ]);
    expect(out.indexOf('strong')).toBeLessThan(out.indexOf('weak'));
  });

  it('truncates when over maxChars', () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      principle: `rule ${i} `.repeat(10),
      strength: 0.5,
      createdAt: new Date(),
    }));
    const out = renderPriorCorrections(big, 200);
    expect(out.length).toBeLessThanOrEqual(260);
    expect(out).toMatch(/truncated/);
  });
});
