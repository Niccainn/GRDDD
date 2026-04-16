/**
 * Plausible Analytics read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://plausible.io/api/v1';

type PlausibleCreds = { accessToken: string };

export async function getPlausibleClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'plausible', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Plausible integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as PlausibleCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** Get the number of current visitors on a site (real-time). */
    async getRealtimeVisitors(siteId: string) {
      const res = await fetch(
        `${API_BASE}/stats/realtime/visitors?site_id=${encodeURIComponent(siteId)}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Plausible error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as number;
    },

    /** Get a timeseries of visitor data for a site. */
    async getTimeseries(siteId: string, period = '30d') {
      const res = await fetch(
        `${API_BASE}/stats/timeseries?site_id=${encodeURIComponent(siteId)}&period=${period}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Plausible error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { results: { date: string; visitors: number; pageviews: number }[] };
    },
  };
}
