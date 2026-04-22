/**
 * Derived capability tier per provider.
 *
 * Two rules we hold:
 *   1. Tier is computed from actual code, not hand-declared in the
 *      registry. Hand-declared tiers drift — the registry ends up
 *      claiming "live sync" for a provider whose fetcher was never
 *      written. Here the single source of truth is the dispatcher's
 *      IMPLEMENTED_SYNC_PROVIDERS set and the IMPORT_PROVIDERS list.
 *   2. "Connect only" is honest — the token is stored so the user
 *      can invoke it from Nova tools or custom workflows, but we do
 *      NOT promise continuous data flow.
 *
 * The tier surfaces on the /integrations page as a coloured chip,
 * and on the landing page as an accurate count so we don't imply
 * "110 providers with live data flow" when the truth is "110 can
 * connect, 4 flow continuously."
 */

// IMPORTANT: do NOT import from ./sync/dispatcher here. That module
// pulls in node:dns/promises via the SSRF-safe HTTP client and
// breaks the client bundle. Import the tiny plain-data module
// instead — the dispatcher re-exports from the same source of
// truth so nothing drifts.
import { IMPLEMENTED_SYNC_PROVIDERS } from './sync-providers';

export type CapabilityTier = 'live_sync' | 'import' | 'webhook' | 'connect_only';

/**
 * Providers supported by the welcome-wizard import path. Keep in sync
 * with lib/integrations/import/*-fetcher.ts. CSV is listed but isn't
 * a "provider" in the registry sense — it's a manual file path.
 */
export const IMPORT_PROVIDERS: ReadonlySet<string> = new Set([
  'notion',
  'asana',
  'monday',
]);

/**
 * Providers with a dedicated webhook receiver route (as opposed to
 * the generic workflow-webhook endpoint). These push data IN without
 * requiring a scheduled pull.
 */
export const WEBHOOK_RECEIVERS: ReadonlySet<string> = new Set([
  'slack', // app/api/webhooks/slack
  'stripe', // app/api/billing/webhook
]);

export function capabilityTier(provider: string): CapabilityTier {
  if (IMPLEMENTED_SYNC_PROVIDERS.has(provider)) return 'live_sync';
  if (IMPORT_PROVIDERS.has(provider)) return 'import';
  if (WEBHOOK_RECEIVERS.has(provider)) return 'webhook';
  return 'connect_only';
}

export type TierMeta = {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  explainer: string;
};

export const TIER_META: Record<CapabilityTier, TierMeta> = {
  live_sync: {
    label: 'Live sync',
    shortLabel: 'Live',
    color: '#C8F26B',
    bg: 'rgba(200,242,107,0.1)',
    border: 'rgba(200,242,107,0.25)',
    explainer:
      'Data pulls in automatically every 15 minutes and on demand via the Sync button.',
  },
  import: {
    label: 'One-click import',
    shortLabel: 'Import',
    color: '#7193ED',
    bg: 'rgba(113,147,237,0.1)',
    border: 'rgba(113,147,237,0.25)',
    explainer:
      'Full one-time import from this provider at onboarding. No continuous sync yet.',
  },
  webhook: {
    label: 'Webhook push',
    shortLabel: 'Webhook',
    color: '#BF9FF1',
    bg: 'rgba(191,159,241,0.1)',
    border: 'rgba(191,159,241,0.25)',
    explainer:
      'Accepts inbound events from this provider. Configure the webhook URL in the provider dashboard.',
  },
  connect_only: {
    label: 'Connect only',
    shortLabel: 'Connect',
    color: 'rgba(255,255,255,0.4)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    explainer:
      'Credentials stored securely so Nova tools and custom workflows can use them. No automatic data pull yet.',
  },
};

/**
 * Counts for the landing page / marketing. Single source of truth so
 * claims never drift from reality. Computed per call (cheap — constant
 * set operations) so any new sync provider added to the dispatcher
 * automatically updates the copy.
 */
export function capabilityCounts(allProviders: readonly string[]): {
  total: number;
  liveSync: number;
  import: number;
  webhook: number;
  connectOnly: number;
} {
  let liveSync = 0;
  let imp = 0;
  let webhook = 0;
  let connectOnly = 0;
  for (const p of allProviders) {
    switch (capabilityTier(p)) {
      case 'live_sync': liveSync++; break;
      case 'import': imp++; break;
      case 'webhook': webhook++; break;
      case 'connect_only': connectOnly++; break;
    }
  }
  return {
    total: allProviders.length,
    liveSync,
    import: imp,
    webhook,
    connectOnly,
  };
}
