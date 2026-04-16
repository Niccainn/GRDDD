/**
 * SendGrid read client. Uses the SendGrid v3 API with bearer token
 * (API key) authentication for email stats and contact management.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SendGridCreds = { apiKey: string };

const API_BASE = 'https://api.sendgrid.com/v3';

export async function getSendGridClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'sendgrid', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('SendGrid integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SendGridCreds;
  const headers = { Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SendGrid ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Get global email stats for the last N days. */
    async getStats(days = 7) {
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
      const data = await get<
        {
          date: string;
          stats: { metrics: { requests: number; delivered: number; opens: number; clicks: number; bounces: number; spam_reports: number } }[];
        }[]
      >(`/stats?start_date=${startDate}&aggregated_by=day`);
      return data.map(d => ({
        date: d.date,
        requests: d.stats[0]?.metrics.requests ?? 0,
        delivered: d.stats[0]?.metrics.delivered ?? 0,
        opens: d.stats[0]?.metrics.opens ?? 0,
        clicks: d.stats[0]?.metrics.clicks ?? 0,
        bounces: d.stats[0]?.metrics.bounces ?? 0,
        spamReports: d.stats[0]?.metrics.spam_reports ?? 0,
      }));
    },

    /** List marketing contacts. */
    async listContacts(limit = 50) {
      const data = await get<{
        result: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          created_at: string;
        }[];
        contact_count: number;
      }>(`/marketing/contacts?page_size=${limit}`);
      return {
        contacts: data.result.map(c => ({
          id: c.id,
          email: c.email,
          firstName: c.first_name,
          lastName: c.last_name,
          createdAt: c.created_at,
        })),
        totalCount: data.contact_count,
      };
    },
  };
}
