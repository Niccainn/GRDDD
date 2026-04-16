/**
 * PagerDuty read client. Uses Bearer auth with "Token token=" prefix.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.pagerduty.com';

type PagerDutyCreds = { accessToken: string };

export async function getPagerDutyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'pagerduty', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('PagerDuty integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as PagerDutyCreds;
  const headers = { Authorization: `Token token=${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List incidents. */
    async listIncidents(limit = 25, status: 'triggered' | 'acknowledged' | 'resolved' | '' = '') {
      const params = new URLSearchParams({ limit: String(limit) });
      if (status) params.set('statuses[]', status);
      const res = await fetch(`${API_BASE}/incidents?${params}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`PagerDuty error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { incidents: { id: string; incident_number: number; title: string; status: string; urgency: string; created_at: string }[] };
    },

    /** List all services. */
    async listServices() {
      const res = await fetch(`${API_BASE}/services`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`PagerDuty error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { services: { id: string; name: string; status: string; description: string }[] };
    },
  };
}
