/**
 * Deel read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.deel.com/rest/v2';

type DeelCreds = { accessToken: string };

export async function getDeelClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'deel', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Deel integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as DeelCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List contracts. */
    async listContracts(limit = 50) {
      const res = await fetch(`${API_BASE}/contracts?limit=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Deel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { id: string; title: string; status: string; type: string; worker: { name: string }; client: { name: string } }[] };
    },

    /** List invoices. */
    async listInvoices(limit = 50) {
      const res = await fetch(`${API_BASE}/invoices?limit=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Deel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { id: string; amount: number; currency: string; status: string; due_date: string; contract_id: string }[] };
    },
  };
}
