/**
 * Crisp read client. Uses the v1 API with Basic auth
 * (identifier:key). Conversations for support dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type CrispCreds = { identifier: string; key: string };
const API_BASE = 'https://api.crisp.chat/v1';

export async function getCrispClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'crisp', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Crisp integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as CrispCreds;
  const authHeader = `Basic ${btoa(`${creds.identifier}:${creds.key}`)}`;
  const headers = { Authorization: authHeader, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Crisp ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent conversations for a website. */
    async listConversations(websiteId: string, limit = 25) {
      const data = await get<{
        data: {
          session_id: string;
          state: string;
          status: number;
          is_verified: boolean;
          meta: { nickname?: string; email?: string };
          created_at: number;
          updated_at: number;
        }[];
      }>(`/website/${websiteId}/conversations/${1}`, { order_date_created: 'desc' });
      return data.data.slice(0, limit).map(c => ({
        sessionId: c.session_id,
        state: c.state,
        status: c.status,
        nickname: c.meta.nickname ?? null,
        email: c.meta.email ?? null,
        createdAt: new Date(c.created_at).toISOString(),
        updatedAt: new Date(c.updated_at).toISOString(),
      }));
    },
  };
}
