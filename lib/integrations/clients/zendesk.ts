/**
 * Zendesk read client. Uses the Support API v2 with Bearer auth.
 * Tickets and ticket counts for support dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ZendeskCreds = { accessToken: string; subdomain: string };

export async function getZendeskClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'zendesk', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Zendesk integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ZendeskCreds;
  const base = `https://${creds.subdomain}.zendesk.com/api/v2`;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zendesk ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent tickets, optionally filtered by status. */
    async listTickets(limit = 25, status?: string) {
      const params: Record<string, string> = { per_page: String(limit), sort_by: 'created_at', sort_order: 'desc' };
      if (status) params.status = status;
      const data = await get<{
        tickets: {
          id: number;
          subject: string;
          status: string;
          priority: string | null;
          requester_id: number;
          assignee_id: number | null;
          created_at: string;
          updated_at: string;
        }[];
      }>('/tickets.json', params);
      return data.tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        requesterId: t.requester_id,
        assigneeId: t.assignee_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    },

    /** Ticket counts by status. */
    async getTicketCounts() {
      const data = await get<{
        count: { value: number; refreshed_at: string };
      }>('/tickets/count.json');
      return { total: data.count.value, refreshedAt: data.count.refreshed_at };
    },
  };
}
