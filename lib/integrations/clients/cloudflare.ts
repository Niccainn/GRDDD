/**
 * Cloudflare read client. Loads the Integration row, decrypts the
 * API token, and exposes a minimal set of read operations that can
 * be surfaced as agent tool calls.
 *
 * Write operations (purge cache, update DNS records) are NOT exposed
 * here in Phase 1 — they require the explicit-permission layer we
 * haven't built yet. When we do, they go in a sibling file so the
 * read path stays obviously safe-to-call.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.cloudflare.com/client/v4';

type CloudflareCreds = { apiToken: string };

/**
 * Load an Integration by id, verify ownership, decrypt credentials,
 * and return a ready-to-use auth header.
 */
export async function getCloudflareClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      environmentId,
      provider: 'cloudflare',
      deletedAt: null,
      status: 'ACTIVE',
    },
  });
  if (!integration) throw new Error('Cloudflare integration not found or not active');

  let creds: CloudflareCreds;
  try {
    creds = JSON.parse(decryptString(integration.credentialsEnc)) as CloudflareCreds;
  } catch {
    throw new Error('Failed to decrypt Cloudflare credentials — token may need reconnecting');
  }

  const authHeaders = {
    Authorization: `Bearer ${creds.apiToken}`,
    Accept: 'application/json',
  };

  return {
    integration,
    /** List zones (domains) accessible with this token. */
    async listZones(limit = 50): Promise<{ id: string; name: string; status: string }[]> {
      const res = await fetch(`${API_BASE}/zones?per_page=${limit}`, { headers: authHeaders });
      const payload = (await res.json()) as {
        success: boolean;
        result?: { id: string; name: string; status: string }[];
        errors?: { message: string }[];
      };
      if (!payload.success) throw new Error(payload.errors?.[0]?.message ?? 'Cloudflare listZones failed');
      return payload.result ?? [];
    },

    /** List DNS records for a given zone. */
    async listDnsRecords(zoneId: string, limit = 100): Promise<
      { id: string; type: string; name: string; content: string; proxied: boolean }[]
    > {
      const res = await fetch(`${API_BASE}/zones/${zoneId}/dns_records?per_page=${limit}`, {
        headers: authHeaders,
      });
      const payload = (await res.json()) as {
        success: boolean;
        result?: { id: string; type: string; name: string; content: string; proxied: boolean }[];
        errors?: { message: string }[];
      };
      if (!payload.success) throw new Error(payload.errors?.[0]?.message ?? 'Cloudflare listDnsRecords failed');
      return payload.result ?? [];
    },

    /** Fetch 24h request analytics for a zone (used by dashboard widgets). */
    async zoneAnalytics24h(zoneId: string): Promise<{
      requests: number;
      bandwidth: number;
      threats: number;
      cachedRequests: number;
    }> {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const until = new Date().toISOString();
      const res = await fetch(
        `${API_BASE}/zones/${zoneId}/analytics/dashboard?since=${since}&until=${until}&continuous=true`,
        { headers: authHeaders },
      );
      const payload = (await res.json()) as {
        success: boolean;
        result?: { totals: { requests: { all: number }; bandwidth: { all: number }; threats: { all: number }; requests_cached?: number } };
        errors?: { message: string }[];
      };
      if (!payload.success) throw new Error(payload.errors?.[0]?.message ?? 'Cloudflare analytics failed');
      const totals = payload.result?.totals;
      return {
        requests: totals?.requests?.all ?? 0,
        bandwidth: totals?.bandwidth?.all ?? 0,
        threats: totals?.threats?.all ?? 0,
        cachedRequests: totals?.requests_cached ?? 0,
      };
    },
  };
}
