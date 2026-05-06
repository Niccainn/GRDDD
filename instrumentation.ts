/**
 * Next.js instrumentation hook — boots Sentry on every server start.
 *
 * App Router uses this file (instead of separate sentry config files
 * loaded per-runtime) to wire up server + edge SDKs at the right
 * moment in the request lifecycle. The client config still lives in
 * sentry.client.config.ts and is loaded via the build plugin.
 *
 * Both runtimes are a no-op when SENTRY_DSN is unset, so dev builds
 * and pre-launch deployments without monitoring keep working.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Captures uncaught request errors thrown inside React Server
 * Components / route handlers. Without this, server-side render
 * errors surface as 500s with no Sentry breadcrumb. Re-exported
 * from @sentry/nextjs which already has the correct signatures
 * for Next.js's instrumentation hook contract.
 */
export { captureRequestError as onRequestError } from '@sentry/nextjs';
