import { describe, it, expect } from 'vitest';
import { tierFor } from '../components/ConfidenceChip';

/**
 * The ConfidenceChip's colour/label is driven by the score band. The
 * bands are research-motivated (Hendrycks et al. 2021 on calibrated
 * trust) — verify they're stable so a refactor can't silently shift
 * the labelling and break the user's mental model.
 */

describe('ConfidenceChip.tierFor — band boundaries', () => {
  it.each([
    [0.0, 'low'],
    [0.25, 'low'],
    [0.39, 'low'],
    [0.4, 'moderate'],
    [0.64, 'moderate'],
    [0.65, 'good'],
    [0.84, 'good'],
    [0.85, 'high'],
    [1.0, 'high'],
  ])('score %f → %s', (score, label) => {
    expect(tierFor(score).label).toBe(label);
  });

  it('low / high use contrasting colours', () => {
    const low = tierFor(0.1);
    const high = tierFor(0.95);
    expect(low.color).not.toBe(high.color);
  });

  it('moderate uses warning colour (yellow) for user attention', () => {
    expect(tierFor(0.5).color).toMatch(/F7C700|#F7C700/);
  });
});
