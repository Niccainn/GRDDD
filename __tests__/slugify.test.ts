import { describe, it, expect } from 'vitest';
import { slugify } from '../lib/forms';

/**
 * Slugs are used as URL paths (/f/<slug>) and as part of environment
 * identifiers. Reliability here prevents broken form links and
 * environment collisions.
 */
describe('slugify', () => {
  it('lowercases', () => {
    expect(slugify('Contact Us')).toBe('contact-us');
  });

  it('replaces runs of non-alphanumerics with a single dash', () => {
    expect(slugify('Hello !!!   World')).toBe('hello-world');
    expect(slugify('a.b.c')).toBe('a-b-c');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('  ---Acme---  ')).toBe('acme');
    expect(slugify('!!!boom')).toBe('boom');
  });

  it('caps length at 60 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long)).toHaveLength(60);
  });

  it('falls back to "form" on empty or all-punctuation input', () => {
    expect(slugify('')).toBe('form');
    expect(slugify('!!!')).toBe('form');
    expect(slugify('   ')).toBe('form');
  });

  it('drops unicode/diacritics (current behaviour — documents the gap)', () => {
    // The current implementation strips non-ASCII entirely. This test
    // documents that and will flag if we ever switch to unicode-aware
    // slugging (e.g. via a transliteration lib).
    expect(slugify('café')).toBe('caf');
    expect(slugify('日本語')).toBe('form');
  });

  it('handles emoji by stripping them', () => {
    expect(slugify('🚀 launch 🚀')).toBe('launch');
  });
});
