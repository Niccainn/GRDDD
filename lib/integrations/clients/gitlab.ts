/**
 * GitLab read client. Uses PRIVATE-TOKEN header auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://gitlab.com/api/v4';

type GitLabCreds = { accessToken: string };

export async function getGitLabClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'gitlab', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('GitLab integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GitLabCreds;
  const headers = { 'PRIVATE-TOKEN': creds.accessToken, Accept: 'application/json' };

  return {
    integration,

    /** List projects accessible to the authenticated user. */
    async listProjects(limit = 20) {
      const res = await fetch(
        `${API_BASE}/projects?membership=true&per_page=${limit}&order_by=updated_at`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`GitLab error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: number; name: string; path_with_namespace: string; web_url: string }[];
    },

    /** List merge requests for a project. */
    async listMergeRequests(projectId: number | string, state: 'opened' | 'merged' | 'closed' | 'all' = 'opened', limit = 20) {
      const res = await fetch(
        `${API_BASE}/projects/${encodeURIComponent(projectId)}/merge_requests?state=${state}&per_page=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`GitLab error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: number; iid: number; title: string; state: string; author: { username: string }; web_url: string }[];
    },

    /** List issues for a project. */
    async listIssues(projectId: number | string, state: 'opened' | 'closed' | 'all' = 'opened', limit = 20) {
      const res = await fetch(
        `${API_BASE}/projects/${encodeURIComponent(projectId)}/issues?state=${state}&per_page=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`GitLab error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: number; iid: number; title: string; state: string; author: { username: string }; web_url: string }[];
    },
  };
}
