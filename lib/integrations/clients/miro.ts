/**
 * Miro read client. Uses the v2 API with Bearer auth.
 * Boards and board items for collaboration dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type MiroCreds = { accessToken: string };
const API_BASE = 'https://api.miro.com/v2';

export async function getMiroClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'miro', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Miro integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MiroCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Miro ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent boards. */
    async listBoards(limit = 25) {
      const data = await get<{
        data: {
          id: string;
          name: string;
          description: string;
          viewLink: string;
          owner: { id: string; name: string };
          createdAt: string;
          modifiedAt: string;
        }[];
      }>('/boards', { limit: String(limit), sort: 'last_modified' });
      return data.data.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        viewLink: b.viewLink,
        ownerId: b.owner.id,
        ownerName: b.owner.name,
        createdAt: b.createdAt,
        modifiedAt: b.modifiedAt,
      }));
    },

    /** Items on a specific board. */
    async getBoardItems(boardId: string, limit = 50) {
      const data = await get<{
        data: {
          id: string;
          type: string;
          data?: { content?: string; title?: string };
          createdAt: string;
          modifiedAt: string;
          createdBy: { id: string; name: string };
        }[];
      }>(`/boards/${boardId}/items`, { limit: String(limit) });
      return data.data.map(i => ({
        id: i.id,
        type: i.type,
        content: i.data?.content ?? i.data?.title ?? null,
        createdAt: i.createdAt,
        modifiedAt: i.modifiedAt,
        createdBy: i.createdBy.name,
      }));
    },
  };
}
