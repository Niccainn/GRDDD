/**
 * Sentry browser config — runs on every client page load.
 *
 * Initialised only when NEXT_PUBLIC_SENTRY_DSN is set. If the env
 * var is absent (local dev, preview deploys without monitoring) the
 * SDK initialises as a no-op so nothing breaks.
 *
 * Sample rates are deliberately low for launch — Sentry's free tier
 * is 5k errors / 10k traces per month, and a noisy SPA can burn
 * through that in a day. Tune up later when we have signal on which
 * routes matter.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Trace 10% of transactions to keep quota healthy. Errors are
    // captured at 100%; this rate is for performance traces only.
    tracesSampleRate: 0.1,
    // Session replay catches client-side state at the moment a user
    // hit an error. 0% by default, 100% on error so we get the
    // playback only when something went wrong.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII fields by default — Sentry will redact common
    // forms (passwords, credit cards) but Identity.name/email are
    // already encrypted at rest and shouldn't leak into events.
    sendDefaultPii: false,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Filter out the noisy class of errors that aren't actionable —
    // see Sentry's recommended ignore list. Add to this as we see
    // patterns we don't care about.
    ignoreErrors: [
      // Browser extensions injecting their own scripts.
      'top.GLOBALS',
      // Known harmless ResizeObserver spam.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network blips that don't represent a bug.
      'NetworkError when attempting to fetch resource',
      'Load failed',
    ],
  });
}
