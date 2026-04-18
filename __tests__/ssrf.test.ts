import { describe, it, expect } from 'vitest';
import { assertSafeUrl, isSafeUrl, SsrfBlockedError } from '../lib/security/ssrf';

/**
 * SSRF guard — unit coverage.
 *
 * Every URL that comes from a tenant (webhooks, form submits, future
 * integrations) passes through assertSafeUrl. One missed edge case
 * here is an SSRF in prod, so the test matrix is intentionally broad.
 */

describe('assertSafeUrl — allowed', () => {
  it.each([
    'https://example.com',
    'https://api.anthropic.com/v1/messages',
    'http://example.com:8080/path?x=1',
    'https://subdomain.example.com',
    'https://github.com/user/repo',
  ])('accepts %s', url => {
    expect(() => assertSafeUrl(url)).not.toThrow();
  });
});

describe('assertSafeUrl — schemes', () => {
  it.each([
    'file:///etc/passwd',
    'ftp://example.com',
    'gopher://example.com',
    'data:text/html,<script>alert(1)</script>',
    'javascript:alert(1)',
    'chrome://settings',
  ])('blocks %s', url => {
    expect(() => assertSafeUrl(url)).toThrow(SsrfBlockedError);
  });

  it('respects custom allowedSchemes', () => {
    expect(() => assertSafeUrl('ws://example.com', { allowedSchemes: ['ws:', 'wss:'] })).not.toThrow();
  });
});

describe('assertSafeUrl — IPv4 ranges', () => {
  it.each([
    'http://127.0.0.1/',
    'http://127.0.0.1:5432/',
    'http://localhost',
    'http://0.0.0.0/',
    'http://10.0.0.1/',
    'http://10.255.255.255',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.1.1',
    'http://169.254.169.254/latest/meta-data/', // AWS/GCP metadata
    'http://224.0.0.1', // multicast
    'http://255.255.255.255', // reserved/broadcast
  ])('blocks %s', url => {
    expect(() => assertSafeUrl(url)).toThrow(SsrfBlockedError);
  });

  // Boundary of the 172.16.0.0/12 range — 172.15/.32 are public.
  it('allows addresses just outside private ranges', () => {
    expect(() => assertSafeUrl('http://172.15.0.1')).not.toThrow();
    expect(() => assertSafeUrl('http://172.32.0.1')).not.toThrow();
    expect(() => assertSafeUrl('http://11.0.0.1')).not.toThrow();
  });
});

describe('assertSafeUrl — IPv6 ranges', () => {
  it.each([
    'http://[::1]/',
    'http://[::]/',
    'http://[fe80::1]/',
    'http://[fc00::1]/',
    'http://[ff00::1]/', // multicast
    'http://[::ffff:127.0.0.1]/', // v4-mapped loopback
    'http://[::ffff:169.254.169.254]/', // v4-mapped metadata
  ])('blocks %s', url => {
    expect(() => assertSafeUrl(url)).toThrow(SsrfBlockedError);
  });
});

describe('assertSafeUrl — hostname blocklist', () => {
  it.each([
    'http://localhost/',
    'http://metadata.google.internal/',
    'http://kubernetes.default.svc/',
  ])('blocks %s', url => {
    expect(() => assertSafeUrl(url)).toThrow(SsrfBlockedError);
  });
});

describe('assertSafeUrl — credentials', () => {
  it('rejects URLs with userinfo', () => {
    expect(() => assertSafeUrl('https://user:pass@example.com')).toThrow(/credentials/);
    expect(() => assertSafeUrl('https://user@example.com')).toThrow(/credentials/);
  });

  it('userinfo rejection blocks the @-smuggle trick', () => {
    // Naive parsers treat "127.0.0.1" as host; strict URL parsers treat it
    // as the userinfo. Either way we reject.
    expect(() => assertSafeUrl('https://attacker.com@127.0.0.1')).toThrow(SsrfBlockedError);
  });
});

describe('assertSafeUrl — allowLocalhost escape hatch', () => {
  it('permits loopback when allowLocalhost is true', () => {
    expect(() => assertSafeUrl('http://127.0.0.1:3000', { allowLocalhost: true })).not.toThrow();
    expect(() => assertSafeUrl('http://localhost', { allowLocalhost: true })).not.toThrow();
  });

  it('still rejects invalid schemes even with allowLocalhost', () => {
    expect(() => assertSafeUrl('file:///etc/passwd', { allowLocalhost: true })).toThrow();
  });
});

describe('isSafeUrl helper', () => {
  it('returns true/false instead of throwing', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://127.0.0.1')).toBe(false);
    expect(isSafeUrl('not-a-url')).toBe(false);
  });
});

describe('assertSafeUrl — malformed input', () => {
  it.each(['', 'not a url', 'https://', '://nope'])('rejects %j', url => {
    expect(() => assertSafeUrl(url)).toThrow(SsrfBlockedError);
  });
});
