/**
 * Monitoring — env-gated exception + event capture.
 *
 * A thin facade over Sentry. If `SENTRY_DSN` is unset this becomes a
 * no-op that logs to the Vercel function log via `console.error`, so
 * every call site can ship the same line of code whether or not the
 * environment has a Sentry project attached yet.
 *
 * Why a facade and not `@sentry/nextjs` directly:
 *   - The Sentry Next.js SDK wants a full build-time integration
 *     (sentry.client.config.ts, sentry.server.config.ts, a webpack
 *     plugin for source maps). That's fine for a production deploy,
 *     but blocks local dev + CI when the env isn't set.
 *   - A facade lets us progressively upgrade: ship the no-op today,
 *     add Sentry properly when the deploy lands, and never change any
 *     call site.
 *   - Dynamic import means the dep is only loaded when it's actually
 *     configured — no cold-start penalty for dev boots.
 *
 * Usage:
 *   import { captureException } from '@/lib/monitoring';
 *   try { ... } catch (err) { captureException(err, { surface: 'cron' }); }
 */

type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface CaptureContext {
  surface?: string;
  tenantId?: string;
  route?: string;
  extras?: Record<string, unknown>;
  tags?: Record<string, string>;
}

function isEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

let sentryModulePromise: Promise<unknown> | null = null;

async function loadSentry(): Promise<unknown> {
  if (!isEnabled()) return null;
  if (!sentryModulePromise) {
    const pkg = '@sentry' + '/node';
    sentryModulePromise = (Function('p', 'return import(p)')(pkg) as Promise<unknown>).then((mod: unknown) => {
      try {
        (mod as unknown as { init: (opts: unknown) => void }).init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
          tracesSampleRate: 0.1,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[monitoring] Sentry init failed:', err);
      }
      return mod;
    }).catch((err) => {
      // Package not installed — drop back to no-op quietly.
      // eslint-disable-next-line no-console
      console.warn('[monitoring] @sentry/node not installed, using console fallback:', err instanceof Error ? err.message : String(err));
      return null;
    });
  }
  return sentryModulePromise;
}

/**
 * Capture an exception. Never throws — swallows its own errors so
 * monitoring code can't itself take down a request.
 */
export async function captureException(
  err: unknown,
  context: CaptureContext = {}
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  // Always log locally so devs see it in the terminal.
  // eslint-disable-next-line no-console
  console.error('[monitoring]', message, context, err);

  if (!isEnabled()) return;

  try {
    const sentry = (await loadSentry()) as {
      withScope: (cb: (scope: unknown) => void) => void;
      captureException: (e: unknown) => void;
    } | null;
    if (!sentry) return;
    sentry.withScope((scope) => {
      const s = scope as {
        setTag: (k: string, v: string) => void;
        setExtra: (k: string, v: unknown) => void;
        setContext: (k: string, v: unknown) => void;
      };
      if (context.surface) s.setTag('surface', context.surface);
      if (context.route) s.setTag('route', context.route);
      if (context.tenantId) s.setTag('tenantId', context.tenantId);
      if (context.tags) {
        for (const [k, v] of Object.entries(context.tags)) s.setTag(k, v);
      }
      if (context.extras) {
        for (const [k, v] of Object.entries(context.extras)) s.setExtra(k, v);
      }
      sentry.captureException(err);
    });
  } catch (innerErr) {
    // eslint-disable-next-line no-console
    console.error('[monitoring] captureException failed:', innerErr);
  }
}

/**
 * Capture a non-exception event (e.g. "budget exceeded", "webhook
 * token rejected"). Useful for business-level alerts that aren't
 * errors per se.
 */
export async function captureMessage(
  message: string,
  level: Level = 'info',
  context: CaptureContext = {}
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[monitoring:${level}]`, message, context);

  if (!isEnabled()) return;

  try {
    const sentry = (await loadSentry()) as {
      withScope: (cb: (scope: unknown) => void) => void;
      captureMessage: (msg: string, level?: Level) => void;
    } | null;
    if (!sentry) return;
    sentry.withScope((scope) => {
      const s = scope as {
        setTag: (k: string, v: string) => void;
        setExtra: (k: string, v: unknown) => void;
      };
      if (context.surface) s.setTag('surface', context.surface);
      if (context.route) s.setTag('route', context.route);
      if (context.tenantId) s.setTag('tenantId', context.tenantId);
      if (context.tags) {
        for (const [k, v] of Object.entries(context.tags)) s.setTag(k, v);
      }
      if (context.extras) {
        for (const [k, v] of Object.entries(context.extras)) s.setExtra(k, v);
      }
      sentry.captureMessage(message, level);
    });
  } catch (innerErr) {
    // eslint-disable-next-line no-console
    console.error('[monitoring] captureMessage failed:', innerErr);
  }
}

export function isMonitoringConfigured(): boolean {
  return isEnabled();
}
