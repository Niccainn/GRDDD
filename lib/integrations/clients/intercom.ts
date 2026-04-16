/**
 * Intercom read client. Uses the REST API v2 with Bearer auth.
 * Conversations, admins, and counts for support dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type IntercomCreds = { accessToken: string };
const API_BASE = 'https://api.intercom.io';

export async function getIntercomClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'intercom', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Intercom integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as IntercomCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Intercom ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent conversations. */
    async listConversations(limit = 25) {
      const data = await get<{
        conversations: {
          id: string;
          title: string | null;
          state: string;
          open: boolean;
          created_at: number;
          updated_at: number;
          assignee: { id: string; type: string } | null;
          statistics: { time_to_first_response?: number; count_reopens?: number };
        }[];
      }>('/conversations', { per_page: String(limit), order: 'updated_at', sort: 'desc' });
      return data.conversations.map(c => ({
        id: c.id,
        title: c.title,
        state: c.state,
        open: c.open,
        assigneeId: c.assignee?.id ?? null,
        createdAt: new Date(c.created_at * 1000).toISOString(),
        updatedAt: new Date(c.updated_at * 1000).toISOString(),
      }));
    },

    /** All admins/teammates. */
    async getAdmins() {
      const data = await get<{
        admins: { id: string; name: string; email: string; role: string; away_mode_enabled: boolean }[];
      }>('/admins');
      return data.admins.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        away: a.away_mode_enabled,
      }));
    },

    /** App-level counts (users, companies, etc.). */
    async getCounts() {
      const data = await get<{
        type: string;
        company: { count: number };
        user_segment: { count: number };
        tag: { count: number };
      }>('/counts');
      return data;
    },
  };
}
