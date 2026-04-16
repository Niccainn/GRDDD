/**
 * BambooHR read client. Uses Basic auth with apiKey:x (password is literal "x").
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type BambooHRCreds = { apiKey: string; subdomain: string };

export async function getBambooHRClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'bamboohr', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('BambooHR integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BambooHRCreds;
  const basic = Buffer.from(`${creds.apiKey}:x`).toString('base64');
  const baseUrl = `https://api.bamboohr.com/api/gateway.php/${creds.subdomain}/v1`;
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };

  return {
    integration,

    /** List employees in the directory. */
    async listEmployees() {
      const res = await fetch(`${baseUrl}/employees/directory`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`BambooHR error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { employees: { id: string; displayName: string; department: string; jobTitle: string; workEmail: string }[] };
    },

    /** Get time-off requests in a date range (YYYY-MM-DD). */
    async getTimeOff(startDate: string, endDate: string) {
      const res = await fetch(
        `${baseUrl}/time_off/requests/?start=${startDate}&end=${endDate}&status=approved`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`BambooHR error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; employeeId: string; start: string; end: string; type: { name: string }; status: { status: string } }[];
    },
  };
}
