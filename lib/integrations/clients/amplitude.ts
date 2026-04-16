/**
 * Amplitude read client. Uses Basic auth with api_key:api_secret.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://amplitude.com/api/2';

type AmplitudeCreds = { apiKey: string; apiSecret: string };

export async function getAmplitudeClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'amplitude', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Amplitude integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as AmplitudeCreds;
  const basic = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };

  return {
    integration,

    /** Get active and new user counts (today). */
    async getActiveUsers() {
      const res = await fetch(`${API_BASE}/users`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Amplitude error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { series: number[][]; seriesLabels: string[] } };
    },

    /** Get event counts for a specific event type. */
    async getEventCounts(eventType: string) {
      const params = new URLSearchParams({ e: JSON.stringify({ event_type: eventType }), m: 'totals', start: '7d' });
      const res = await fetch(`${API_BASE}/events/segmentation?${params}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Amplitude error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { series: number[][]; xValues: string[] } };
    },
  };
}
