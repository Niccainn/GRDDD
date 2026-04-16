/**
 * Supabase read client. Uses apikey header + Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SupabaseCreds = { accessToken: string; apiKey: string; projectRef: string };

export async function getSupabaseClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'supabase', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Supabase integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SupabaseCreds;
  const baseUrl = `https://${creds.projectRef}.supabase.co/rest/v1`;
  const headers = {
    apikey: creds.apiKey,
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };

  return {
    integration,

    /** List tables via the OpenAPI schema endpoint. */
    async listTables() {
      const res = await fetch(`https://${creds.projectRef}.supabase.co/rest/v1/`, {
        headers: { ...headers, Accept: 'application/openapi+json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Supabase error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const schema = (await res.json()) as { paths: Record<string, unknown> };
      return Object.keys(schema.paths).filter(p => p.startsWith('/')).map(p => p.slice(1));
    },

    /** Query rows from a table. */
    async queryTable(table: string, limit = 50) {
      const res = await fetch(
        `${baseUrl}/${encodeURIComponent(table)}?limit=${limit}&select=*`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Supabase error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as Record<string, unknown>[];
    },
  };
}
