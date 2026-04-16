/**
 * Todoist read client. Bearer token authentication against the REST v2 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TodoistCreds = { accessToken: string };

const API_BASE = 'https://api.todoist.com/rest/v2';

export async function getTodoistClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'todoist', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Todoist integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TodoistCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List active tasks. Todoist returns all active tasks; we cap at limit. */
    async listTasks(limit = 20) {
      const url = `${API_BASE}/tasks`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Todoist error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; content: string; description: string; is_completed: boolean;
        due: { date: string; string: string } | null; priority: number; project_id: string;
        created_at: string;
      }[];
      return data.slice(0, limit).map(t => ({
        id: t.id,
        content: t.content,
        description: t.description,
        completed: t.is_completed,
        due: t.due?.date ?? null,
        dueLabel: t.due?.string ?? null,
        priority: t.priority,
        projectId: t.project_id,
      }));
    },

    /** List all projects. */
    async listProjects() {
      const url = `${API_BASE}/projects`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Todoist error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; name: string; color: string; is_favorite: boolean; comment_count: number;
      }[];
      return data.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isFavorite: p.is_favorite,
        commentCount: p.comment_count,
      }));
    },
  };
}
