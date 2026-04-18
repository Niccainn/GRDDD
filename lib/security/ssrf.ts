/**
 * SSRF (Server-Side Request Forgery) URL guard.
 *
 * Any fetch() that accepts a user-supplied URL MUST pass it through
 * `assertSafeUrl` or `isSafeUrl` first. Covers:
 *
 *   - Scheme allowlist (http/https only — no file:, gopher:, ftp:, …)
 *   - Loopback (127.0.0.0/8, ::1)
 *   - Private IPv4 ranges (RFC 1918)
 *   - Link-local / cloud-metadata (169.254.0.0/16, fe80::/10)
 *   - IPv6 loopback, ULA (fc00::/7)
 *   - 0.0.0.0 and broadcast
 *   - localhost + common internal hostnames (metadata.google.internal,
 *     kubernetes.default.svc, etc.)
 *   - Hostnames that resolve to private IPs via IP-literal checks (the
 *     DNS-rebinding case requires a resolver-level check — see
 *     resolveAndValidate below)
 *
 * The guard has two modes:
 *
 *   validateUrl(url)      → sync pre-check on the URL itself (scheme,
 *                           literal IP, obvious hostname). Blocks the
 *                           vast majority of SSRF payloads.
 *
 *   resolveAndValidate()  → async, DOES a DNS lookup. Use for outbound
 *                           integrations where a malicious domain could
 *                           be set to resolve to a private IP. Defense
 *                           in depth — still call validateUrl() first.
 *
 * The allowlist escape hatch (`allowLocalhost: true`) exists for dev
 * fixtures and integration tests ONLY. Never expose it to user code.
 */

import dns from 'node:dns/promises';

export class SsrfBlockedError extends Error {
  reason: string;
  constructor(reason: string) {
    super(`SSRF-blocked URL: ${reason}`);
    this.name = 'SsrfBlockedError';
    this.reason = reason;
  }
}

export type SsrfOptions = {
  /** Additional protocols to allow (default: http/https). */
  allowedSchemes?: string[];
  /** Escape hatch for tests/dev fixtures. DO NOT use with user input. */
  allowLocalhost?: boolean;
};

const DEFAULT_SCHEMES = ['http:', 'https:'];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
]);

/**
 * Given a literal IPv4 address (dotted quad), return true if it's in a
 * blocked range.
 */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map(p => Number(p));
  if (octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) return false;
  const [a, b] = octets;

  // 0.0.0.0/8 — "this" network (also what Node binds on)
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 169.254.0.0/16 — link-local + AWS/GCP metadata (169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 192.0.0.0/24 — reserved
  if (a === 192 && b === 0) return true;
  // 198.18.0.0/15 — benchmark
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 — reserved
  if (a >= 240) return true;
  return false;
}

/**
 * Literal IPv6 range check. Covers loopback, link-local, ULA, and the
 * v4-mapped prefix in both dotted (::ffff:10.0.0.1) and hex-compressed
 * (::ffff:a9fe:a9fe) forms — Node's URL parser normalises to the hex
 * form, so both paths matter.
 *
 * Accepts either the bracketed ("[::1]") or bare ("::1") form.
 */
function isBlockedIPv6(rawIp: string): boolean {
  // Strip surrounding brackets (URL.hostname keeps them) and any zone
  // index suffix (%eth0), lowercase for regex comparison.
  let addr = rawIp.toLowerCase();
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1);
  addr = addr.split('%')[0];

  // Unspecified + loopback
  if (addr === '::' || addr === '::1') return true;
  // Loopback written out (e.g. 0:0:0:0:0:0:0:1)
  if (/^0+(:0+){6}:0*1$/.test(addr)) return true;
  // Link-local fe80::/10 — first 10 bits are 1111111010
  if (/^fe[89ab][0-9a-f]?(:|::)/.test(addr)) return true;
  // Unique local fc00::/7 — first 7 bits are 1111110
  if (/^f[cd][0-9a-f]{0,2}(:|::)/.test(addr)) return true;
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{0,2}(:|::)/.test(addr)) return true;

  // IPv4-mapped dotted form: ::ffff:127.0.0.1
  const v4Dotted = addr.match(/^::ffff:([0-9.]+)$/);
  if (v4Dotted && isBlockedIPv4(v4Dotted[1])) return true;

  // IPv4-mapped hex-compressed: ::ffff:7f00:1 (Node's normalisation).
  // Extract the last two hextets, rebuild dotted-quad, re-check as v4.
  const v4Hex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (v4Hex) {
    const hi = parseInt(v4Hex[1], 16);
    const lo = parseInt(v4Hex[2], 16);
    const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    if (isBlockedIPv4(dotted)) return true;
  }

  return false;
}

/**
 * Synchronous URL validation. Throws SsrfBlockedError on any failed
 * check. Returns the parsed URL on success (saves callers a re-parse).
 */
export function assertSafeUrl(raw: string, opts: SsrfOptions = {}): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SsrfBlockedError('not a valid URL');
  }

  const allowedSchemes = opts.allowedSchemes ?? DEFAULT_SCHEMES;
  if (!allowedSchemes.includes(parsed.protocol)) {
    throw new SsrfBlockedError(`scheme not allowed: ${parsed.protocol}`);
  }

  // userinfo (user:pass@host) frequently used to smuggle past naive
  // parsers. Block unconditionally — legitimate integrations should
  // pass credentials in headers, not the URL.
  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError('URL credentials are not allowed');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) && !opts.allowLocalhost) {
    throw new SsrfBlockedError(`blocked hostname: ${host}`);
  }

  // Hostname that's a literal IP — check ranges. WHATWG URL.hostname
  // KEEPS the surrounding [] on IPv6 (`http://[::1]/` → `[::1]`), so
  // we detect IPv6 by the bracket or by the presence of ':'.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isBlockedIPv4(host) && !opts.allowLocalhost) {
      throw new SsrfBlockedError(`blocked IPv4: ${host}`);
    }
  } else if (host.startsWith('[') || host.includes(':')) {
    if (isBlockedIPv6(host) && !opts.allowLocalhost) {
      throw new SsrfBlockedError(`blocked IPv6: ${host}`);
    }
  }

  return parsed;
}

export function isSafeUrl(raw: string, opts: SsrfOptions = {}): boolean {
  try {
    assertSafeUrl(raw, opts);
    return true;
  } catch {
    return false;
  }
}

/**
 * DNS-aware SSRF check. Use for outbound fetch where a hostname might
 * resolve to a private IP (DNS rebinding or an attacker-controlled
 * domain). Throws if ANY resolved address is in a blocked range.
 *
 * Call `assertSafeUrl` first (fast path), then this for defense in
 * depth before actually dispatching the request.
 */
export async function resolveAndValidate(raw: string, opts: SsrfOptions = {}): Promise<URL> {
  const parsed = assertSafeUrl(raw, opts);
  const host = parsed.hostname;

  // Literal IPs already validated by assertSafeUrl — skip the lookup.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return parsed;

  let addresses: { address: string; family: number }[] = [];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    // DNS failure is not SSRF — let the subsequent fetch fail naturally
    // with its own error (the caller sees "ENOTFOUND" rather than a
    // misleading "blocked" message).
    return parsed;
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isBlockedIPv4(address) && !opts.allowLocalhost) {
      throw new SsrfBlockedError(`${host} resolves to blocked IPv4 ${address}`);
    }
    if (family === 6 && isBlockedIPv6(address) && !opts.allowLocalhost) {
      throw new SsrfBlockedError(`${host} resolves to blocked IPv6 ${address}`);
    }
  }

  return parsed;
}
