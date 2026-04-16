/**
 * Mixpanel read client. Uses Basic auth with a service account
 * (base64-encoded "serviceAccountUser:serviceAccountSecret").
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const DATA_API = 'https://data.mixpanel.com/api/2.0';
const MGMT_API = 'https://mixpanel.com/api/2.0';

type MixpanelCreds = { serviceAccountUser: string; serviceAccountSecret: string; projectId: string };

export async function getMixpanelClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'mixpanel', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Mixpanel integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MixpanelCreds;
  const basic = Buffer.from(`${creds.serviceAccountUser}:${creds.serviceAccountSecret}`).toString('base64');
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };

  return {
    integration,

    /** Get top events for the project. */
    async getTopEvents(limit = 10) {
      const res = await fetch(
        `${MGMT_API}/events/top?project_id=${creds.projectId}&limit=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Mixpanel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { events: Record<string, { count: number }> };
    },

    /** Get event counts for a specific event in a date range. */
    async getEventCounts(event: string, fromDate: string, toDate: string) {
      const params = new URLSearchParams({
        project_id: creds.projectId,
        event: JSON.stringify([event]),
        from_date: fromDate,
        to_date: toDate,
        type: 'general',
        unit: 'day',
      });
      const res = await fetch(`${DATA_API}/events?${params}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Mixpanel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { values: Record<string, Record<string, number>> } };
    },
  };
}
