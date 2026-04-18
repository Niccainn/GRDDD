import { describe, it, expect } from 'vitest';
import { mergeChain } from '../lib/environment/brand-inheritance';

const row = (over: Partial<Record<string, string | null>> = {}) => ({
  id: 'env_x',
  parentEnvironmentId: null,
  brandName: null,
  brandColor: null,
  brandLogo: null,
  brandTone: null,
  brandAudience: null,
  brandValues: null,
  brandKeywords: null,
  brandVoiceDont: null,
  brandBio: null,
  ...over,
} as never);

describe('mergeChain', () => {
  it('child wins over parent', () => {
    const child = row({ brandTone: 'child tone' });
    const parent = row({ brandTone: 'parent tone' });
    const merged = mergeChain([child, parent]);
    expect(merged.brandTone).toBe('child tone');
  });

  it('parent fills when child is blank', () => {
    const child = row({ brandName: 'Child Co' });
    const parent = row({ brandTone: 'parent tone', brandAudience: 'parent audience' });
    const merged = mergeChain([child, parent]);
    expect(merged.brandName).toBe('Child Co');
    expect(merged.brandTone).toBe('parent tone');
    expect(merged.brandAudience).toBe('parent audience');
  });

  it('treats empty string as blank, not a value', () => {
    const merged = mergeChain([row({ brandTone: '' }), row({ brandTone: 'inherited' })]);
    expect(merged.brandTone).toBe('inherited');
  });

  it('returns null for fields no env sets', () => {
    const merged = mergeChain([row(), row()]);
    expect(merged.brandTone).toBeNull();
  });

  it('walks a 3-level chain correctly', () => {
    const grandchild = row({ brandName: 'Grand' });
    const child = row({ brandTone: 'mid tone' });
    const parent = row({ brandValues: 'root values' });
    const merged = mergeChain([grandchild, child, parent]);
    expect(merged.brandName).toBe('Grand');
    expect(merged.brandTone).toBe('mid tone');
    expect(merged.brandValues).toBe('root values');
  });
});
