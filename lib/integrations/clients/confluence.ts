/**
 * Confluence read client. Uses Basic auth with email:apiToken
 * and the domain stored in accountLabel.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ConfluenceCreds = { email: string; apiToken: string };

export async function getConfluenceClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'confluence', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Confluence integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ConfluenceCreds;
  const domain = integration.accountLabel ?? '';
  const base = `https://${domain}.atlassian.net/wiki/rest/api`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`,
    Accept: 'application/json',
  };

  return {
    integration,

    /** Fetch recently updated pages. */
    async getRecentPages(limit = 20) {
      const url = `${base}/content?type=page&limit=${limit}&orderby=lastmodified+desc&expand=version`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Confluence error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        results: { id: string; title: string; status: string; version: { when: string; number: number } }[];
      };
      return data.results.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        lastModified: p.version.when,
        version: p.version.number,
      }));
    },

    /** Search Confluence content by CQL text match. */
    async searchContent(query: string, limit = 20) {
      const cql = encodeURIComponent(`type=page AND text~"${query}"`);
      const url = `${base}/content/search?cql=${cql}&limit=${limit}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Confluence error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        results: { id: string; title: string; type: string; status: string }[];
      };
      return data.results.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        status: r.status,
      }));
    },
  };
}
