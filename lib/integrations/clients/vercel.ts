/**
 * Vercel read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.vercel.com';

type VercelCreds = { accessToken: string };

export async function getVercelClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'vercel', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Vercel integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as VercelCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List projects. */
    async listProjects(limit = 20) {
      const res = await fetch(`${API_BASE}/v9/projects?limit=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Vercel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { projects: { id: string; name: string; framework: string | null; updatedAt: number }[] };
    },

    /** List deployments for a project. */
    async listDeployments(projectId: string, limit = 20) {
      const res = await fetch(
        `${API_BASE}/v6/deployments?projectId=${projectId}&limit=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Vercel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { deployments: { uid: string; name: string; state: string; url: string; created: number }[] };
    },

    /** Get details of a specific project. */
    async getProject(projectId: string) {
      const res = await fetch(`${API_BASE}/v9/projects/${projectId}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Vercel error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; name: string; framework: string | null; nodeVersion: string; targets: Record<string, unknown> };
    },
  };
}
