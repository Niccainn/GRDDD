import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security-headers regression test. Reads middleware.ts as source and
 * asserts the header policy stays within acceptable bounds.
 *
 * Why source-string assertions rather than booting Next and curling?
 * - No server boot needed — runs in the vitest unit pass
 * - Catches accidental weakening (e.g. someone adds 'unsafe-eval' in
 *   prod, or removes frame-ancestors, or widens connect-src)
 * - The E2E suite (playwright) can add a live-server header check too
 */

const src = fs.readFileSync(
  path.resolve(__dirname, '../middleware.ts'),
  'utf-8',
);

describe('security headers policy', () => {
  it('sets HSTS with preload and subdomain inclusion', () => {
    expect(src).toMatch(/Strict-Transport-Security.*max-age=\d{7,}/);
    expect(src).toMatch(/includeSubDomains.*preload/);
  });

  it('denies framing', () => {
    expect(src).toMatch(/X-Frame-Options.*DENY/);
    expect(src).toMatch(/frame-ancestors 'none'/);
  });

  it('prevents MIME sniffing', () => {
    expect(src).toMatch(/X-Content-Type-Options.*nosniff/);
  });

  it('locks connect-src to self + Anthropic only', () => {
    expect(src).toMatch(/connect-src 'self' https:\/\/api\.anthropic\.com/);
  });

  it('restricts permissions for camera, mic, geolocation', () => {
    expect(src).toMatch(/camera=\(\)/);
    expect(src).toMatch(/microphone=\(\)/);
    expect(src).toMatch(/geolocation=\(\)/);
  });

  it('production script-src MUST NOT include unsafe-eval', () => {
    // Assert the prod branch specifically — dev is allowed to use
    // unsafe-eval for Next Fast Refresh.
    const prodScriptSrc = src.match(/: "(script-src 'self' 'unsafe-inline')"/);
    expect(prodScriptSrc).toBeTruthy();
    expect(prodScriptSrc?.[1]).not.toContain('unsafe-eval');
  });

  it('Referrer-Policy is strict-origin-when-cross-origin or stricter', () => {
    expect(src).toMatch(/Referrer-Policy.*strict-origin-when-cross-origin|same-origin|no-referrer/);
  });

  it('base-uri + form-action locked to self', () => {
    expect(src).toMatch(/base-uri 'self'/);
    expect(src).toMatch(/form-action 'self'/);
  });
});
