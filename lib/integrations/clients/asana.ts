/**
 * Asana read client. Bearer token authentication against the v1 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type AsanaCreds = { accessToken: string };

const API_BASE = 'https://app.asana.com/api/1.0';

export async function getAsanaClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'asana', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Asana integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as AsanaCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** Fetch tasks assigned to the authenticated user. */
    async getMyTasks(limit = 20) {
      const url = `${API_BASE}/tasks?assignee=me&completed_since=now&opt_fields=name,completed,due_on,modified_at,assignee_section.name&limit=${limit}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Asana error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        data: { gid: string; name: string; completed: boolean; due_on: string | null; modified_at: string }[];
      };
      return data.data.map(t => ({
        id: t.gid,
        name: t.name,
        completed: t.completed,
        dueOn: t.due_on,
        modifiedAt: t.modified_at,
      }));
    },

    /** List projects in a given workspace. */
    async listProjects(workspaceId: string) {
      const url = `${API_BASE}/projects?workspace=${encodeURIComponent(workspaceId)}&opt_fields=name,color,modified_at,current_status`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Asana error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        data: { gid: string; name: string; color: string | null; modified_at: string }[];
      };
      return data.data.map(p => ({
        id: p.gid,
        name: p.name,
        color: p.color,
        modifiedAt: p.modified_at,
      }));
    },

    /** Get detailed info for a single task. */
    async getTaskDetails(taskId: string) {
      const url = `${API_BASE}/tasks/${encodeURIComponent(taskId)}?opt_fields=name,completed,due_on,notes,assignee.name,projects.name,modified_at`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Asana error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        data: {
          gid: string; name: string; completed: boolean; due_on: string | null; notes: string;
          assignee: { name: string } | null; projects: { gid: string; name: string }[]; modified_at: string;
        };
      };
      const t = data.data;
      return {
        id: t.gid,
        name: t.name,
        completed: t.completed,
        dueOn: t.due_on,
        notes: t.notes,
        assignee: t.assignee?.name ?? null,
        projects: t.projects.map(p => ({ id: p.gid, name: p.name })),
        modifiedAt: t.modified_at,
      };
    },
  };
}
