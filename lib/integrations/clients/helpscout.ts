/**
 * Help Scout read client. Uses the v2 API with Bearer auth.
 * Conversations and mailboxes for support dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type HelpScoutCreds = { accessToken: string };
const API_BASE = 'https://api.helpscout.net/v2';

export async function getHelpScoutClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'helpscout', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Help Scout integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as HelpScoutCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Help Scout ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent conversations, optionally filtered by status. */
    async listConversations(limit = 25, status?: string) {
      const params: Record<string, string> = { pageSize: String(limit), sortField: 'createdAt', sortOrder: 'desc' };
      if (status) params.status = status;
      const data = await get<{
        _embedded: {
          conversations: {
            id: number;
            number: number;
            subject: string;
            status: string;
            state: string;
            mailboxId: number;
            assignee?: { id: number; first: string; last: string };
            createdAt: string;
            closedAt: string | null;
          }[];
        };
        page: { totalElements: number; totalPages: number };
      }>('/conversations', params);
      return {
        conversations: data._embedded.conversations.map(c => ({
          id: c.id,
          number: c.number,
          subject: c.subject,
          status: c.status,
          state: c.state,
          mailboxId: c.mailboxId,
          assignee: c.assignee ? `${c.assignee.first} ${c.assignee.last}` : null,
          createdAt: c.createdAt,
          closedAt: c.closedAt,
        })),
        total: data.page.totalElements,
      };
    },

    /** All mailboxes. */
    async listMailboxes() {
      const data = await get<{
        _embedded: {
          mailboxes: { id: number; name: string; slug: string; email: string }[];
        };
      }>('/mailboxes');
      return data._embedded.mailboxes.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        email: m.email,
      }));
    },
  };
}
