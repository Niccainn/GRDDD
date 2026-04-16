/**
 * PostHog read client. Uses Bearer auth with a personal API key.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://app.posthog.com/api';

type PostHogCreds = { accessToken: string; projectId: string };

export async function getPostHogClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'posthog', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('PostHog integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as PostHogCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List saved insights for the project. */
    async listInsights(limit = 20) {
      const res = await fetch(
        `${API_BASE}/projects/${creds.projectId}/insights/?limit=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`PostHog error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { results: { id: number; name: string; filters: unknown }[] };
    },

    /** Get event definitions for the project. */
    async getEventDefinitions(limit = 50) {
      const res = await fetch(
        `${API_BASE}/projects/${creds.projectId}/event_definitions/?limit=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`PostHog error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { results: { name: string; volume_30_day: number | null; query_usage_30_day: number | null }[] };
    },
  };
}
