/**
 * Trello read client. Uses apiKey + apiToken query-param authentication.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TrelloCreds = { apiKey: string; apiToken: string };

const API_BASE = 'https://api.trello.com/1';

export async function getTrelloClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'trello', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Trello integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TrelloCreds;
  const authParams = `key=${encodeURIComponent(creds.apiKey)}&token=${encodeURIComponent(creds.apiToken)}`;
  const headers = { Accept: 'application/json' };

  return {
    integration,

    /** List all boards for the authenticated member. */
    async listBoards() {
      const url = `${API_BASE}/members/me/boards?fields=name,url,dateLastActivity,closed&${authParams}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Trello error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; name: string; url: string; dateLastActivity: string; closed: boolean;
      }[];
      return data
        .filter(b => !b.closed)
        .map(b => ({
          id: b.id,
          name: b.name,
          url: b.url,
          lastActivity: b.dateLastActivity,
        }));
    },

    /** List cards on a board. */
    async listCards(boardId: string, limit = 50) {
      const url = `${API_BASE}/boards/${encodeURIComponent(boardId)}/cards?fields=name,idList,due,dateLastActivity,shortUrl&limit=${limit}&${authParams}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Trello error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; name: string; idList: string; due: string | null; dateLastActivity: string; shortUrl: string;
      }[];
      return data.map(c => ({
        id: c.id,
        name: c.name,
        listId: c.idList,
        due: c.due,
        lastActivity: c.dateLastActivity,
        url: c.shortUrl,
      }));
    },
  };
}
