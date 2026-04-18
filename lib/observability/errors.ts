/**
 * Self-hosted error log. Zero external dependencies, zero SaaS cost.
 *
 * Stores errors + warnings in an AppError table in our own Postgres.
 * Advantages over a paid error-tracking SaaS during beta:
 *   - $0 marginal cost (aligns with GRID's BYOK / zero-platform-fee thesis)
 *   - Data stays tenant-scoped and on infra we already own
 *   - Queries + retention policies under our control
 *   - Later swappable: if volume grows past what Postgres can trivially
 *     retain, this module is the only call-site that needs updating
 *     to forward to Sentry/Axiom free tier.
 *
 * Usage:
 *   await logError({ scope: 'integration_sync', message: 'Token expired' });
 *
 * Never log credentials, API keys, or raw request bodies. The `context`
 * field is JSON-serialised and truncated to 4 KB — keep it semantic
 * (ids, flags, short messages), not verbatim.
 */

import { prisma } from '../db';

export type LogLevel = 'error' | 'warn' | 'info';

export type LogPayload = {
  scope: string; // "integration_sync" | "kernel" | "auth" | …
  message: string;
  level?: LogLevel;
  environmentId?: string | null;
  identityId?: string | null;
  context?: Record<string, unknown>;
};

const MAX_CONTEXT_BYTES = 4 * 1024;

export async function logError(p: LogPayload): Promise<void> {
  const level: LogLevel = p.level ?? 'error';
  let contextJson: string | null = null;
  if (p.context) {
    try {
      const serialised = JSON.stringify(p.context);
      contextJson = serialised.length > MAX_CONTEXT_BYTES
        ? serialised.slice(0, MAX_CONTEXT_BYTES) + '"…truncated"'
        : serialised;
    } catch {
      contextJson = null; // circular ref or non-serialisable — drop rather than throw
    }
  }

  try {
    await prisma.appError.create({
      data: {
        level,
        scope: p.scope.slice(0, 80),
        message: p.message.slice(0, 1000),
        environmentId: p.environmentId ?? null,
        identityId: p.identityId ?? null,
        context: contextJson,
      },
    });
  } catch (err) {
    // Never let the error log swallow the original error. If the
    // AppError table itself is unreachable, fall back to console.
    // eslint-disable-next-line no-console
    console.error('[logError] failed to persist:', err, 'original:', p);
  }
}

/**
 * Convenience wrapper for the common shape: log+rethrow. Use at the
 * boundary of an async handler where you want the error logged but
 * also want it to propagate to the caller's error boundary.
 */
export async function logAndRethrow<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    await logError({
      scope,
      message: err instanceof Error ? err.message : String(err),
      context: {
        name: err instanceof Error ? err.name : 'unknown',
        stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined,
      },
    });
    throw err;
  }
}
