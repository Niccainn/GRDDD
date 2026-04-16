/**
 * Mux read client. Uses Basic auth with tokenId:tokenSecret.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.mux.com';

type MuxCreds = { tokenId: string; tokenSecret: string };

export async function getMuxClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'mux', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Mux integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MuxCreds;
  const basic = Buffer.from(`${creds.tokenId}:${creds.tokenSecret}`).toString('base64');
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };

  return {
    integration,

    /** List video assets. */
    async listAssets(limit = 20) {
      const res = await fetch(`${API_BASE}/video/v1/assets?limit=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Mux error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { id: string; status: string; duration: number; created_at: string; playback_ids?: { id: string; policy: string }[] }[] };
    },

    /** Get playback IDs for a specific asset. */
    async getAssetPlaybackIds(assetId: string) {
      const res = await fetch(`${API_BASE}/video/v1/assets/${assetId}/playback-ids`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Mux error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { id: string; policy: string }[] };
    },
  };
}
