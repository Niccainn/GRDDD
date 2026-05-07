/**
 * Sentry server config — runs in the Node runtime (every API route,
 * every server component render, every server action).
 *
 * No-op when SENTRY_DSN is unset.
 *
 * Notable difference from the client config: tracesSampleRate is
 * lower (5%) because server-side traces include every API call and
 * the volume is much higher. Errors stay at 100%.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Don't capture expected 401/403/404s as errors — they're
    // intended behaviour, not bugs. The `beforeSend` hook drops them
    // before they hit the wire.
    beforeSend(event, hint) {
      const err = hint?.originalException as { status?: number; statusCode?: number } | undefined;
      const status = err?.status ?? err?.statusCode;
      if (status && [400, 401, 403, 404, 410, 429].includes(status)) {
        return null;
      }
      return event;
    },
  });
}
