/**
 * Sentry read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://sentry.io/api/0';

type SentryCreds = { accessToken: string };

export async function getSentryClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'sentry', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Sentry integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SentryCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List projects across all organizations the token has access to. */
    async listProjects() {
      const res = await fetch(`${API_BASE}/projects/`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Sentry error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; slug: string; name: string; organization: { slug: string } }[];
    },

    /** List issues for an organization/project. */
    async listIssues(organizationSlug: string, projectSlug: string, limit = 25) {
      const res = await fetch(
        `${API_BASE}/projects/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(projectSlug)}/issues/?limit=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Sentry error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; shortId: string; title: string; culprit: string; count: string; level: string; firstSeen: string; lastSeen: string }[];
    },
  };
}
