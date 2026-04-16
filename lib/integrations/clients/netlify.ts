/**
 * Netlify read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.netlify.com/api/v1';

type NetlifyCreds = { accessToken: string };

export async function getNetlifyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'netlify', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Netlify integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as NetlifyCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List sites. */
    async listSites(limit = 20) {
      const res = await fetch(`${API_BASE}/sites?per_page=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Netlify error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; name: string; url: string; ssl_url: string; admin_url: string; created_at: string }[];
    },

    /** List deploys for a site. */
    async listDeploys(siteId: string, limit = 20) {
      const res = await fetch(
        `${API_BASE}/sites/${siteId}/deploys?per_page=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Netlify error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; state: string; branch: string; deploy_url: string; created_at: string; published_at: string | null }[];
    },
  };
}
