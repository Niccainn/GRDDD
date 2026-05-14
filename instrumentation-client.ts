/**
 * Sentry client entry — Next.js 15+ / @sentry/nextjs v8+ convention.
 *
 * Why this file exists:
 *   The legacy `sentry.client.config.ts` filename is silently ignored
 *   by @sentry/nextjs v9+ (we're on v10.51.0). The SDK's auto-import
 *   looks for `instrumentation-client.ts` at the project root instead.
 *   Without this file the client Sentry.init() never runs even when
 *   NEXT_PUBLIC_SENTRY_DSN is set — the env var ends up inlined into
 *   a file webpack tree-shakes away, the SDK never reaches the
 *   browser bundle, and the Sentry onboarding wizard sits at step 1
 *   waiting for a first event forever.
 *
 *   We re-export from the original config rather than duplicate it,
 *   so the two filenames stay in lockstep — touching one updates
 *   both. The init code runs at module load time via the import
 *   side-effect.
 *
 *   Once the legacy `sentry.client.config.ts` is removed, paste its
 *   body inline here and drop this comment.
 */

import './sentry.client.config';
