/**
 * Fly.io read client. Uses Bearer auth with the Machines API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.machines.dev/v1';

type FlyIoCreds = { accessToken: string };

export async function getFlyIoClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'fly_io', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Fly.io integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as FlyIoCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List apps for an organization. */
    async listApps(orgSlug: string) {
      const res = await fetch(`${API_BASE}/apps?org_slug=${encodeURIComponent(orgSlug)}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Fly.io error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { total_apps: number; apps: { id: string; name: string; status: string; organization: { slug: string } }[] };
    },

    /** List machines for an app. */
    async listMachines(appName: string) {
      const res = await fetch(`${API_BASE}/apps/${encodeURIComponent(appName)}/machines`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Fly.io error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; name: string; state: string; region: string; instance_id: string; config: { image: string } }[];
    },
  };
}
