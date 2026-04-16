/**
 * Box read client. Uses the v2.0 API with Bearer auth.
 * Folder items and file search for cloud storage dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type BoxCreds = { accessToken: string };
const API_BASE = 'https://api.box.com/2.0';

export async function getBoxClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'box', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Box integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BoxCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Box ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  type BoxItem = {
    id: string;
    type: string;
    name: string;
    size?: number;
    modified_at: string;
    created_at: string;
    modified_by?: { id: string; name: string; login: string };
    shared_link?: { url: string } | null;
  };

  function mapItem(item: BoxItem) {
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      size: item.size ?? null,
      modifiedAt: item.modified_at,
      createdAt: item.created_at,
      modifiedBy: item.modified_by?.name ?? null,
      sharedLink: item.shared_link?.url ?? null,
    };
  }

  return {
    integration,

    /** List items in a folder (default: root folder "0"). */
    async listItems(folderId = '0', limit = 25) {
      const data = await get<{
        entries: BoxItem[];
        total_count: number;
      }>(`/folders/${folderId}/items`, {
        limit: String(limit),
        fields: 'id,type,name,size,modified_at,created_at,modified_by,shared_link',
      });
      return { items: data.entries.map(mapItem), total: data.total_count };
    },

    /** Search files by query. */
    async searchFiles(query: string) {
      const data = await get<{
        entries: BoxItem[];
        total_count: number;
      }>('/search', {
        query,
        limit: '25',
        fields: 'id,type,name,size,modified_at,created_at,modified_by,shared_link',
      });
      return { items: data.entries.map(mapItem), total: data.total_count };
    },
  };
}
