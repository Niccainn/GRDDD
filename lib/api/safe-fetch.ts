/**
 * safe-fetch — guarded JSON fetch helpers.
 *
 * The recurring crash pattern in the codebase looks like:
 *
 *   fetch('/api/foo').then(r => r.json()).then(d => setX(d))
 *
 * On any 5xx, 401, malformed JSON, or shape mismatch, `setX` lands a
 * value that doesn't match its declared type — and the next render
 * blows up on `.map` / `.length` / property access. Page-level error
 * boundary fires; user sees a broken view.
 *
 * These helpers wrap fetch+json+validate+fallback in one call so
 * callers can't forget any layer:
 *
 *   const envs = await fetchArray<Env>('/api/environments');
 *   //              -> Env[]   (always; never throws)
 *
 *   const me = await fetchObject<User>('/api/auth/me');
 *   //         -> User | null (null on any failure)
 *
 *   const data = await safeFetch('/api/custom', undefined, {
 *     fallback: { perSystem: [] as PerSystem[], total: 0 },
 *     validate: d => (d && Array.isArray(d.perSystem) ? d : null) ?? fallback,
 *   });
 *
 * Design notes
 * ─────────────
 * - Fail-soft, not fail-loud: every failure mode (network, !ok, JSON
 *   parse, validation) returns the fallback. We deliberately do NOT
 *   throw — caller doesn't have to wrap in try/catch.
 * - Cancellation: callers should pass an AbortSignal in `init` and
 *   own the cancellation lifecycle. This module doesn't track it.
 * - 401/403: returned as fallback, not as a special error. Auth
 *   handling lives at the layout layer (middleware redirects, the
 *   AuthProvider effect). Components don't need to know.
 */

export type SafeFetchOptions<T> = {
  /**
   * Convert raw parsed JSON to a value of type T. Return `null` to
   * signal "doesn't match expected shape" — the helper will use
   * `fallback` instead. If omitted, the parsed JSON is cast as T.
   */
  validate?: (data: unknown) => T | null;
  /** Returned on any failure (network, !ok, parse, validate=null). */
  fallback: T;
};

export async function safeFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  opts: SafeFetchOptions<T>,
): Promise<T> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) return opts.fallback;
    const data: unknown = await res.json();
    if (opts.validate) {
      const validated = opts.validate(data);
      return validated ?? opts.fallback;
    }
    return data as T;
  } catch {
    return opts.fallback;
  }
}

/**
 * Fetch a JSON array. Always returns an array — empty on any failure.
 * Useful for `setEnvironments`, `setMembers`, `setSystems` — the
 * exact pattern that crashed RoiSummaryWidget / TasksPage / LearnPage
 * / SystemExecutionChart in the field.
 */
export async function fetchArray<T>(
  url: string,
  init?: RequestInit,
): Promise<T[]> {
  return safeFetch<T[]>(url, init, {
    fallback: [],
    validate: d => (Array.isArray(d) ? (d as T[]) : null),
  });
}

/**
 * Fetch a JSON object. Returns null on any failure (caller gets
 * a clean nullable to render against).
 */
export async function fetchObject<T extends object>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  return safeFetch<T | null>(url, init, {
    fallback: null,
    validate: d => (d && typeof d === 'object' && !Array.isArray(d) ? (d as T) : null),
  });
}
