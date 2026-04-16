/**
 * Coda read client. Bearer token authentication against the v1 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type CodaCreds = { accessToken: string };

const API_BASE = 'https://coda.io/apis/v1';

export async function getCodaClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'coda', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Coda integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as CodaCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List recent docs visible to the authenticated user. */
    async listDocs(limit = 20) {
      const url = `${API_BASE}/docs?limit=${limit}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Coda error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        items: { id: string; name: string; createdAt: string; updatedAt: string; folder: { id: string; name: string } }[];
      };
      return data.items.map(d => ({
        id: d.id,
        name: d.name,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        folderName: d.folder?.name ?? null,
      }));
    },

    /** Get a single doc by ID. */
    async getDoc(docId: string) {
      const url = `${API_BASE}/docs/${encodeURIComponent(docId)}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Coda error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; name: string; createdAt: string; updatedAt: string; owner: string;
      };
      return {
        id: data.id,
        name: data.name,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        owner: data.owner,
      };
    },
  };
}
