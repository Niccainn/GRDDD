/**
 * Canonical list of providers with a dedicated live-sync fetcher.
 *
 * Lives in its own zero-dependency module so the client-safe
 * `lib/integrations/capability.ts` can read it without pulling in
 * the sync dispatcher — which transitively imports Node-only
 * modules (node:dns/promises via lib/security/ssrf.ts). Any
 * attempt to import this from the browser is safe.
 *
 * When you ship a new fetcher, add the provider slug here AND wire
 * it into lib/integrations/sync/dispatcher.ts. The dispatcher
 * re-exports this set as its source of truth.
 */

export const IMPLEMENTED_SYNC_PROVIDERS: ReadonlySet<string> = new Set([
  'notion',
  'slack',
  'google_calendar',
  'google-calendar',
  'hubspot',
]);
