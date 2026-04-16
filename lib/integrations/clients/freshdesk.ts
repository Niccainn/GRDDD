/**
 * Freshdesk read client. Uses the v2 API with Basic auth (apiKey:X).
 * Tickets and stats for support dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type FreshdeskCreds = { apiKey: string; domain: string };

export async function getFreshdeskClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'freshdesk', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Freshdesk integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as FreshdeskCreds;
  const base = `https://${creds.domain}.freshdesk.com/api/v2`;
  const authHeader = `Basic ${btoa(`${creds.apiKey}:X`)}`;
  const headers = { Authorization: authHeader, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Freshdesk ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent tickets. */
    async listTickets(limit = 30) {
      const data = await get<{
        id: number;
        subject: string;
        status: number;
        priority: number;
        type: string | null;
        requester_id: number;
        responder_id: number | null;
        created_at: string;
        updated_at: string;
      }[]>('/tickets', { per_page: String(limit), order_by: 'created_at', order_type: 'desc' });
      return data.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        type: t.type,
        requesterId: t.requester_id,
        responderId: t.responder_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    },

    /** Ticket stats (open, pending, resolved, etc.). */
    async getTicketStats() {
      // Freshdesk doesn't have a dedicated stats endpoint, so we use
      // the ticket filter API to count by status
      const statuses = [
        { id: 2, name: 'open' },
        { id: 3, name: 'pending' },
        { id: 4, name: 'resolved' },
        { id: 5, name: 'closed' },
      ];
      const counts: Record<string, number> = {};
      for (const s of statuses) {
        const tickets = await get<{ id: number }[]>('/tickets', { filter: `status:${s.id}`, per_page: '1' });
        counts[s.name] = tickets.length;
      }
      return counts;
    },
  };
}
