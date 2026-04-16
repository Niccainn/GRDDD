/**
 * Segment read client. Uses Bearer auth with a Segment API token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.segmentapis.com';

type SegmentCreds = { accessToken: string };

export async function getSegmentClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'segment', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Segment integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SegmentCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List all sources in the workspace. */
    async listSources() {
      const res = await fetch(`${API_BASE}/sources`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Segment error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { sources: { id: string; slug: string; name: string; enabled: boolean }[] } };
    },

    /** Get events for a specific source (delivery overview). */
    async getSourceEvents(sourceId: string) {
      const res = await fetch(
        `${API_BASE}/sources/${sourceId}/delivery-overview`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Segment error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { dataset: { eventName: string; total: number }[] } };
    },
  };
}
