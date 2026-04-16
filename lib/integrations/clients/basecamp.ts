/**
 * Basecamp read client. OAuth Bearer token authentication against the v3 API.
 * accountLabel stores the Basecamp account ID.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type BasecampCreds = { accessToken: string };

export async function getBasecampClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'basecamp', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Basecamp integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BasecampCreds;
  const accountId = integration.accountLabel ?? '';
  const base = `https://3.basecampapi.com/${encodeURIComponent(accountId)}`;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List all active projects. */
    async listProjects() {
      const url = `${base}/projects.json`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Basecamp error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: number; name: string; description: string; status: string; updated_at: string;
      }[];
      return data.map(p => ({
        id: String(p.id),
        name: p.name,
        description: p.description,
        status: p.status,
        updatedAt: p.updated_at,
      }));
    },

    /** Get a single project by ID. */
    async getProject(projectId: string) {
      const url = `${base}/projects/${encodeURIComponent(projectId)}.json`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Basecamp error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: number; name: string; description: string; status: string; updated_at: string;
        dock: { name: string; title: string; enabled: boolean }[];
      };
      return {
        id: String(data.id),
        name: data.name,
        description: data.description,
        status: data.status,
        updatedAt: data.updated_at,
        tools: data.dock.filter(d => d.enabled).map(d => d.title),
      };
    },
  };
}
