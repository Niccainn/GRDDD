/**
 * Wrike read client. Bearer token authentication against the v4 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type WrikeCreds = { accessToken: string };

const API_BASE = 'https://www.wrike.com/api/v4';

export async function getWrikeClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'wrike', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Wrike integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as WrikeCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List folders in the workspace. */
    async listFolders() {
      const url = `${API_BASE}/folders`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Wrike error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        data: { id: string; title: string; scope: string; childIds: string[] }[];
      };
      return data.data.map(f => ({
        id: f.id,
        title: f.title,
        scope: f.scope,
        childCount: f.childIds.length,
      }));
    },

    /** List tasks in a folder. */
    async listTasks(folderId: string, limit = 20) {
      const url = `${API_BASE}/folders/${encodeURIComponent(folderId)}/tasks?pageSize=${limit}&sortField=UpdatedDate&sortOrder=Desc`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Wrike error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        data: { id: string; title: string; status: string; importance: string; updatedDate: string; dates: { due?: string } }[];
      };
      return data.data.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        importance: t.importance,
        updatedAt: t.updatedDate,
        dueDate: t.dates.due ?? null,
      }));
    },
  };
}
