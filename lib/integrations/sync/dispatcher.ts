/**
 * Integration sync dispatcher.
 *
 * The contract: given a connected Integration row, pull items updated
 * since `since`, convert each to a normalised SyncItem, and return
 * them. The caller persists each as a Signal for Nova to triage.
 *
 * Each provider gets its own fetcher. The dispatcher is a switch so
 * adding a provider is O(1) — implement SyncFetcher, add one line
 * to the switch, ship. Providers without a fetcher land in the
 * default branch which returns `{ ok: false, reason: 'not_implemented' }`
 * rather than silently pretending success.
 *
 * This replaces the stub in app/api/integrations/[id]/sync/route.ts
 * which used to write one fake "sync triggered" signal and call it
 * done. Now the route calls dispatch() and persists real items.
 */

import { decryptString } from '@/lib/crypto/key-encryption';
import { syncNotion } from './notion';
import { syncSlack } from './slack';
import { syncGoogleCalendar } from './google-calendar';
import { syncHubspot } from './hubspot';

export type SyncItem = {
  /** Stable ID from the provider so duplicates can be deduped. */
  sourceId: string;
  /** What to show in the inbox. */
  title: string;
  /** Longer context — Nova reads this when triaging. */
  body?: string;
  /** "info" | "warning" | "critical" — mapped from provider urgency. */
  priority?: string;
  /** When the event happened at the provider, not when we fetched. */
  occurredAt?: Date;
  /** Deep link back to the source system for the human reviewer. */
  sourceUrl?: string;
  /** Raw extra fields Nova can use — JSON-serialised into Signal.metadata-ish free text. */
  metadata?: Record<string, unknown>;
};

export type SyncResult =
  | { ok: true; items: SyncItem[]; provider: string }
  | { ok: false; provider: string; reason: string };

export type IntegrationLike = {
  id: string;
  provider: string;
  credentialsEnc: string;
  refreshTokenEnc?: string | null;
  expiresAt?: Date | null;
  accountLabel?: string | null;
};

export type Credentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountLabel?: string;
};

/**
 * Decrypt credentials ONCE per dispatch. Fetchers receive the
 * plaintext and are responsible for not logging it. Returns null if
 * the ciphertext can't be decrypted (key rotation, tamper, etc.) so
 * the caller can flag the integration as needing reconnection.
 */
export function decryptCredentials(integration: IntegrationLike): Credentials | null {
  try {
    const accessToken = decryptString(integration.credentialsEnc);
    const creds: Credentials = { accessToken };
    if (integration.refreshTokenEnc) {
      try {
        creds.refreshToken = decryptString(integration.refreshTokenEnc);
      } catch {
        // Refresh token corrupt — access token may still be valid
        // enough for one more sync. Don't fail the whole dispatch.
      }
    }
    if (integration.expiresAt) creds.expiresAt = integration.expiresAt;
    if (integration.accountLabel) creds.accountLabel = integration.accountLabel;
    return creds;
  } catch {
    return null;
  }
}

/**
 * Route the sync to the correct provider fetcher.
 */
export async function dispatchSync(
  integration: IntegrationLike,
  since: Date,
): Promise<SyncResult> {
  const creds = decryptCredentials(integration);
  if (!creds) {
    return {
      ok: false,
      provider: integration.provider,
      reason: 'credential_decrypt_failed',
    };
  }

  try {
    switch (integration.provider) {
      case 'notion':
        return { ok: true, provider: 'notion', items: await syncNotion(creds, since) };
      case 'slack':
        return { ok: true, provider: 'slack', items: await syncSlack(creds, since) };
      case 'google_calendar':
      case 'google-calendar':
        return {
          ok: true,
          provider: 'google_calendar',
          items: await syncGoogleCalendar(creds, since),
        };
      case 'hubspot':
        return { ok: true, provider: 'hubspot', items: await syncHubspot(creds, since) };
      default:
        return {
          ok: false,
          provider: integration.provider,
          reason: 'not_implemented',
        };
    }
  } catch (err) {
    // Don't leak provider-specific error text to callers — integrations
    // error all the time and the message can contain tokens. Log
    // server-side, return a generic reason.
    // eslint-disable-next-line no-console
    console.error(`[sync.${integration.provider}] fetch error`, err);
    return {
      ok: false,
      provider: integration.provider,
      reason: 'fetch_failed',
    };
  }
}

/**
 * Which providers currently have a working sync fetcher. Used by the
 * UI to show "Sync now" only when it'll do something real, and by
 * /api/health to report sync coverage.
 */
export const IMPLEMENTED_SYNC_PROVIDERS: ReadonlySet<string> = new Set([
  'notion',
  'slack',
  'google_calendar',
  'google-calendar',
  'hubspot',
]);
