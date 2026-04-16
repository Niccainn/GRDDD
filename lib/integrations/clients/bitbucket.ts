/**
 * Bitbucket read client. Uses Bearer auth with an OAuth access token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.bitbucket.org/2.0';

type BitbucketCreds = { accessToken: string; workspace: string };

export async function getBitbucketClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'bitbucket', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Bitbucket integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BitbucketCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List repositories in the workspace. */
    async listRepositories(limit = 20) {
      const res = await fetch(
        `${API_BASE}/repositories/${encodeURIComponent(creds.workspace)}?pagelen=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Bitbucket error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { values: { uuid: string; slug: string; name: string; full_name: string }[] };
    },

    /** List pull requests for a repository. */
    async listPullRequests(repoSlug: string, state: 'OPEN' | 'MERGED' | 'DECLINED' = 'OPEN', limit = 20) {
      const res = await fetch(
        `${API_BASE}/repositories/${encodeURIComponent(creds.workspace)}/${encodeURIComponent(repoSlug)}/pullrequests?state=${state}&pagelen=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Bitbucket error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { values: { id: number; title: string; state: string; author: { display_name: string }; links: { html: { href: string } } }[] };
    },
  };
}
