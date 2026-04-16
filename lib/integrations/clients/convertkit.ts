/**
 * ConvertKit read client. Uses the ConvertKit v3 API with api_secret
 * passed as a query parameter for subscribers, forms, and sequences.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ConvertKitCreds = { apiSecret: string };

const API_BASE = 'https://api.convertkit.com/v3';

export async function getConvertKitClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'convertkit', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('ConvertKit integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ConvertKitCreds;

  async function get<T>(path: string, extraParams: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('api_secret', creds.apiSecret);
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ConvertKit ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List subscribers with optional limit. */
    async getSubscribers(limit = 50) {
      const data = await get<{
        total_subscribers: number;
        subscribers: {
          id: number;
          email_address: string;
          state: string;
          created_at: string;
          fields: Record<string, string | null>;
        }[];
      }>('/subscribers', { sort_order: 'desc', page: '1' });
      return {
        total: data.total_subscribers,
        subscribers: data.subscribers.slice(0, limit).map(s => ({
          id: s.id,
          email: s.email_address,
          state: s.state,
          createdAt: s.created_at,
        })),
      };
    },

    /** List all forms. */
    async listForms() {
      const data = await get<{
        forms: { id: number; name: string; type: string; created_at: string }[];
      }>('/forms');
      return data.forms.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        createdAt: f.created_at,
      }));
    },

    /** List all sequences (autoresponders). */
    async listSequences() {
      const data = await get<{
        courses: { id: number; name: string; created_at: string }[];
      }>('/sequences');
      return data.courses.map(s => ({
        id: s.id,
        name: s.name,
        createdAt: s.created_at,
      }));
    },
  };
}
