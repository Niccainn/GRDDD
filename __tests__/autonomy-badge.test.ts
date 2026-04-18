import { describe, it, expect } from 'vitest';
import { TIER_META } from '../components/AutonomyBadge';

/**
 * The autonomy tier taxonomy is load-bearing across:
 *   - SystemAgent.autonomyTier (DB field)
 *   - Scaffold spec validation (Zod enum in lib/scaffold/spec.ts)
 *   - Kernel runtime (lib/agents/system-agent.ts)
 *   - This badge (user-visible surface)
 *
 * All four must agree. This test locks the badge's copy so a
 * well-meaning refactor can't drift the user-facing vocabulary.
 */

describe('AutonomyBadge tier metadata', () => {
  it.each([
    ['Observe', /read/i],
    ['Suggest', /propose|draft|approv/i],
    ['Act', /act|tool/i],
    ['Autonomous', /multi-step|without per-step/i],
    ['Self-Direct', /own tasks|highest/i],
  ])('tier "%s" explainer describes its constraint', (tier, regex) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (TIER_META as any)[tier];
    expect(meta).toBeDefined();
    expect(meta.explainer).toMatch(regex);
  });

  it('each tier has a distinct colour so users can differentiate at a glance', () => {
    const colours = Object.values(TIER_META).map(m => m.color);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it('natural phrasing differs from terse tier label (so users read it as a verb state)', () => {
    for (const meta of Object.values(TIER_META)) {
      expect(meta.naturalLabel.toLowerCase()).not.toBe(meta.label.toLowerCase());
    }
  });
});
