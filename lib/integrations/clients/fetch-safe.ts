/**
 * Safe fetch wrapper for integration clients.
 *
 * Provides:
 *   - 10-second timeout (prevents hanging requests from blocking)
 *   - Automatic res.ok check with truncated error messages
 *   - Credential-safe error messages (never leaks tokens/keys)
 *   - Retry-After header handling for rate limits
 *
 * Usage:
 *   import { safeFetch } from './fetch-safe';
 *   const data = await safeFetch<MyType>(url, { headers });
 */

import { resolveAndValidate, SsrfBlockedError } from '../../security/ssrf';

const DEFAULT_TIMEOUT_MS = 10_000;

export class IntegrationFetchError extends Error {
  status: number;
  retryAfter: number | null;

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = 'IntegrationFetchError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Fetch with timeout, status check, and credential-safe errors.
 * Throws IntegrationFetchError on non-2xx responses.
 */
export async function safeFetch<T = unknown>(
  url: string | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Strip custom prop before passing to native fetch
  const fetchInit = { ...init };
  delete (fetchInit as Record<string, unknown>).timeoutMs;

  // Add timeout signal
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  fetchInit.signal = controller.signal;

  // SSRF guard — DNS-resolving check before actually dispatching. All
  // outbound integration fetches go through this wrapper so callers
  // get SSRF protection for free.
  const urlStr = url instanceof URL ? url.toString() : url;
  try {
    await resolveAndValidate(urlStr);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof SsrfBlockedError) {
      throw new IntegrationFetchError(`URL blocked by SSRF policy: ${e.reason}`, 0);
    }
    throw new IntegrationFetchError('Invalid URL', 0);
  }

  let res: Response;
  try {
    res = await fetch(urlStr, { ...fetchInit, redirect: fetchInit.redirect ?? 'manual' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new IntegrationFetchError(`Request timed out after ${timeoutMs}ms`, 408);
    }
    throw new IntegrationFetchError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Read rate limit headers
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;

    // Truncate body to avoid leaking sensitive data in error messages
    let body = '';
    try {
      body = await res.text();
      body = body.slice(0, 200);
    } catch {
      body = '(could not read response body)';
    }

    // Sanitize — strip anything that looks like a token/key from error
    body = body.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]');

    throw new IntegrationFetchError(
      `HTTP ${res.status}: ${body}`,
      res.status,
      retryAfter,
    );
  }

  return (await res.json()) as T;
}
