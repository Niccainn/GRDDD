/**
 * Centralised same-origin redirect validation.
 *
 * Open-redirect is the easy mistake in OAuth and post-auth flows:
 * `?next=https://evil.com` slips into a redirect helper that only
 * checks `startsWith('/')` and the user lands on the attacker's page
 * still believing they signed into the right site. We had two
 * implementations of this check (lib/auth/google.ts and
 * lib/auth/post-auth-destination.ts) — small drift between them is
 * how this class of bug grows. One helper, one rule.
 *
 * Rule: a path is safe to redirect to when it begins with a single
 * "/" and not "//" (which would be a protocol-relative URL). We also
 * reject anything containing a backslash, a control char, or a CR/LF
 * (header injection vector) and anything longer than 2048 chars.
 */

const MAX_LEN = 2048;
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f\\]/;

export function isSafeRedirect(path: string | null | undefined): path is string {
  if (!path) return false;
  if (typeof path !== 'string') return false;
  if (path.length === 0 || path.length > MAX_LEN) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (FORBIDDEN_CHARS.test(path)) return false;
  return true;
}

/**
 * Convenience: return `path` if safe, otherwise `fallback`.
 */
export function safeRedirect(path: string | null | undefined, fallback: string): string {
  return isSafeRedirect(path) ? path : fallback;
}
