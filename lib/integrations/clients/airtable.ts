/**
 * Airtable read client. Uses the REST API for listing bases, reading
 * records, and fetching base schemas. Bearer token auth via personal
 * access token or OAuth token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type AirtableCreds = { accessToken: string };

const API_BASE = 'https://api.airtable.com/v0';

export async function getAirtableClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'airtable', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Airtable integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as AirtableCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };

  async function get<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable API error (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List all bases accessible to the token. */
    async listBases() {
      const data = await get<{
        bases: { id: string; name: string; permissionLevel: string }[];
      }>('https://api.airtable.com/v0/meta/bases');
      return data.bases.map(b => ({
        id: b.id,
        name: b.name,
        permissionLevel: b.permissionLevel,
      }));
    },

    /** List records from a table, with an optional page size limit. */
    async listRecords(baseId: string, tableId: string, limit = 100) {
      const url = new URL(`${API_BASE}/${baseId}/${encodeURIComponent(tableId)}`);
      url.searchParams.set('maxRecords', String(limit));
      const data = await get<{
        records: { id: string; fields: Record<string, unknown>; createdTime: string }[];
      }>(url.toString());
      return data.records.map(r => ({
        id: r.id,
        fields: r.fields,
        createdTime: r.createdTime,
      }));
    },

    /** Get the schema (tables + fields) for a base. */
    async getBaseSchema(baseId: string) {
      const data = await get<{
        tables: {
          id: string;
          name: string;
          fields: { id: string; name: string; type: string; description?: string }[];
        }[];
      }>(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`);
      return data.tables.map(t => ({
        id: t.id,
        name: t.name,
        fields: t.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          description: f.description ?? null,
        })),
      }));
    },
  };
}
