/**
 * Gusto read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.gusto.com/v1';

type GustoCreds = { accessToken: string };

export async function getGustoClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'gusto', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Gusto integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GustoCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List employees for a company. */
    async listEmployees(companyId: string) {
      const res = await fetch(
        `${API_BASE}/companies/${companyId}/employees`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Gusto error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: number; first_name: string; last_name: string; email: string; department: string; terminated: boolean }[];
    },

    /** List payrolls for a company. */
    async getPayrolls(companyId: string, limit = 10) {
      const res = await fetch(
        `${API_BASE}/companies/${companyId}/payrolls?per=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Gusto error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { payroll_deadline: string; check_date: string; processed: boolean; totals: { gross_pay: string; net_pay: string } }[];
    },
  };
}
