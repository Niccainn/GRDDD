/**
 * Monday.com read client. GraphQL API with Bearer token authentication.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type MondayCreds = { accessToken: string };

const API_URL = 'https://api.monday.com/v2';

async function gql<T>(headers: Record<string, string>, query: string): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Monday error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Monday GraphQL: ${json.errors[0].message}`);
  return json.data;
}

export async function getMondayClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'monday', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Monday integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MondayCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List boards visible to the authenticated user. */
    async listBoards(limit = 20) {
      const data = await gql<{
        boards: { id: string; name: string; state: string; updated_at: string }[];
      }>(headers, `{ boards(limit: ${limit}) { id name state updated_at } }`);
      return data.boards.map(b => ({
        id: b.id,
        name: b.name,
        state: b.state,
        updatedAt: b.updated_at,
      }));
    },

    /** List items on a board. */
    async listItems(boardId: string, limit = 20) {
      const data = await gql<{
        boards: { items_page: { items: { id: string; name: string; state: string; updated_at: string; group: { title: string } }[] } }[];
      }>(
        headers,
        `{ boards(ids: [${boardId}]) { items_page(limit: ${limit}) { items { id name state updated_at group { title } } } } }`,
      );
      const items = data.boards[0]?.items_page.items ?? [];
      return items.map(i => ({
        id: i.id,
        name: i.name,
        state: i.state,
        group: i.group.title,
        updatedAt: i.updated_at,
      }));
    },
  };
}
