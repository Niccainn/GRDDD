import { describe, it, expect } from 'vitest';
import { ScaffoldSpec, validateScaffoldIntegrity } from '../lib/scaffold/spec';

const minimalSpec = () => ({
  summary: 'A small creative studio',
  systems: [{ name: 'Production', description: 'Making the work' }],
  workflows: [
    {
      name: 'Kick-off',
      systemName: 'Production',
      stages: [
        { id: 'brief', name: 'Brief', instruction: 'Write the brief.' },
      ],
    },
  ],
  signals: [],
  widgets: [],
  roles: [],
  integrations: [],
});

describe('ScaffoldSpec Zod validation', () => {
  it('accepts a minimal valid spec', () => {
    const result = ScaffoldSpec.safeParse(minimalSpec());
    expect(result.success).toBe(true);
  });

  it('rejects empty systems array (cell must have at least one organelle)', () => {
    const bad = { ...minimalSpec(), systems: [] };
    expect(ScaffoldSpec.safeParse(bad).success).toBe(false);
  });

  it('rejects a workflow with 0 stages', () => {
    const bad = minimalSpec();
    bad.workflows[0].stages = [];
    expect(ScaffoldSpec.safeParse(bad).success).toBe(false);
  });

  it('caps systems at 8', () => {
    const bad = minimalSpec();
    bad.systems = Array.from({ length: 9 }, (_, i) => ({
      name: `S${i}`,
      description: 'x',
    }));
    expect(ScaffoldSpec.safeParse(bad).success).toBe(false);
  });

  it('rejects invalid color format', () => {
    const bad = minimalSpec();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.systems[0] as any).color = 'red';
    expect(ScaffoldSpec.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown widget name', () => {
    const bad = minimalSpec();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.widgets as any[]).push({ widget: 'NonExistentWidget', order: 0 });
    expect(ScaffoldSpec.safeParse(bad).success).toBe(false);
  });
});

describe('validateScaffoldIntegrity', () => {
  it('passes a coherent spec', () => {
    expect(validateScaffoldIntegrity(minimalSpec() as never)).toEqual([]);
  });

  it('flags workflow referencing unknown system', () => {
    const bad = minimalSpec();
    bad.workflows[0].systemName = 'Ghost';
    const errors = validateScaffoldIntegrity(bad as never);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/unknown system "Ghost"/);
  });

  it('flags stage depending on unknown id', () => {
    const bad = minimalSpec();
    bad.workflows[0].stages.push({
      id: 'review',
      name: 'Review',
      instruction: 'Review the brief.',
      dependsOn: ['does-not-exist'],
    } as never);
    const errors = validateScaffoldIntegrity(bad as never);
    expect(errors.some(e => /unknown stage "does-not-exist"/.test(e))).toBe(true);
  });

  it('flags duplicate stage ids within a workflow', () => {
    const bad = minimalSpec();
    bad.workflows[0].stages.push({
      id: 'brief',
      name: 'Another Brief',
      instruction: 'Dup.',
    } as never);
    const errors = validateScaffoldIntegrity(bad as never);
    expect(errors.some(e => /duplicate stage id "brief"/.test(e))).toBe(true);
  });

  it('flags self-referential stage dependency', () => {
    const bad = minimalSpec();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.workflows[0].stages[0] as any).dependsOn = ['brief'];
    const errors = validateScaffoldIntegrity(bad as never);
    expect(errors.some(e => /depends on itself/.test(e))).toBe(true);
  });

  it('flags role hint referencing unknown system', () => {
    const bad = minimalSpec();
    bad.roles.push({
      personHint: 'Marco',
      role: 'CONTRIBUTOR',
      systemName: 'Marketing',
    } as never);
    const errors = validateScaffoldIntegrity(bad as never);
    expect(errors.some(e => /Marco.*unknown system "Marketing"/.test(e))).toBe(true);
  });
});
