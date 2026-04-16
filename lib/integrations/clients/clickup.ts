/**
 * ClickUp read client. Bearer token authentication against the v2 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ClickUpCreds = { accessToken: string };

const API_BASE = 'https://api.clickup.com/api/v2';

export async function getClickUpClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'clickup', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('ClickUp integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ClickUpCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List spaces within a team/workspace. */
    async listSpaces(teamId: string) {
      const url = `${API_BASE}/team/${encodeURIComponent(teamId)}/space`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`ClickUp error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        spaces: { id: string; name: string; statuses: { status: string; color: string }[] }[];
      };
      return data.spaces.map(s => ({
        id: s.id,
        name: s.name,
        statuses: s.statuses.map(st => st.status),
      }));
    },

    /** List tasks in a list. */
    async listTasks(listId: string, limit = 20) {
      const url = `${API_BASE}/list/${encodeURIComponent(listId)}/task?page=0&order_by=updated&reverse=true&subtasks=false&include_closed=false`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`ClickUp error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        tasks: { id: string; name: string; status: { status: string }; date_updated: string; priority: { priority: string } | null; assignees: { username: string }[] }[];
      };
      return data.tasks.slice(0, limit).map(t => ({
        id: t.id,
        name: t.name,
        status: t.status.status,
        priority: t.priority?.priority ?? null,
        assignees: t.assignees.map(a => a.username),
        updatedAt: t.date_updated,
      }));
    },
  };
}
