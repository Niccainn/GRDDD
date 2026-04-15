import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = rateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, 3, 60_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, 3, 60_000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over limit', () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const r3 = rateLimit(key, 2, 60_000);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `test-reset-${Date.now()}`;
    // Use a 50ms window.
    rateLimit(key, 1, 50);
    // Wait for window to elapse.
    await new Promise(resolve => setTimeout(resolve, 60));
    const r2 = rateLimit(key, 1, 50);
    expect(r2.allowed).toBe(true);
  });

  it('uses separate buckets per key', () => {
    const a = `test-a-${Date.now()}`;
    const b = `test-b-${Date.now()}`;
    rateLimit(a, 1, 60_000);
    const r = rateLimit(b, 1, 60_000);
    expect(r.allowed).toBe(true);
  });
});
