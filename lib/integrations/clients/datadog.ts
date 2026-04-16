/**
 * Datadog read client. Uses DD-API-KEY + DD-APPLICATION-KEY headers.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.datadoghq.com/api/v1';

type DatadogCreds = { apiKey: string; applicationKey: string };

export async function getDatadogClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'datadog', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Datadog integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as DatadogCreds;
  const headers = {
    'DD-API-KEY': creds.apiKey,
    'DD-APPLICATION-KEY': creds.applicationKey,
    Accept: 'application/json',
  };

  return {
    integration,

    /** List monitors. */
    async listMonitors(limit = 50) {
      const res = await fetch(`${API_BASE}/monitor?page_size=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Datadog error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: number; name: string; type: string; overall_state: string; query: string }[];
    },

    /** Query a timeseries metric. `from` and `to` are unix timestamps in seconds. */
    async getMetricQuery(query: string, from: number, to: number) {
      const params = new URLSearchParams({ query, from: String(from), to: String(to) });
      const res = await fetch(`${API_BASE}/query?${params}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Datadog error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { series: { metric: string; pointlist: [number, number][] }[] };
    },
  };
}
