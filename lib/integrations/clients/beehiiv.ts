/**
 * Beehiiv read client. Uses the Beehiiv v2 API with OAuth2 bearer
 * token auth for publications, subscribers, and stats.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type BeehiivCreds = { accessToken: string };

const API_BASE = 'https://api.beehiiv.com/v2';

export async function getBeehiivClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'beehiiv', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Beehiiv integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BeehiivCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Beehiiv ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List all publications for the authenticated user. */
    async listPublications() {
      const data = await get<{
        data: {
          id: string;
          name: string;
          url: string;
          created_at: number;
        }[];
      }>('/publications');
      return data.data.map(p => ({
        id: p.id,
        name: p.name,
        url: p.url,
        createdAt: new Date(p.created_at * 1000).toISOString(),
      }));
    },

    /** Get subscribers for a publication. */
    async getSubscribers(publicationId: string, limit = 50) {
      const data = await get<{
        data: {
          id: string;
          email: string;
          status: string;
          created_at: number;
          utm_source: string | null;
        }[];
        total_results: number;
      }>(`/publications/${publicationId}/subscriptions?limit=${limit}`);
      return {
        subscribers: data.data.map(s => ({
          id: s.id,
          email: s.email,
          status: s.status,
          createdAt: new Date(s.created_at * 1000).toISOString(),
          utmSource: s.utm_source,
        })),
        total: data.total_results,
      };
    },

    /** Get stats for a publication. */
    async getStats(publicationId: string) {
      const data = await get<{
        data: {
          active_subscriptions: number;
          total_subscriptions: number;
          average_open_rate: number;
          average_click_rate: number;
        };
      }>(`/publications/${publicationId}/stats`);
      return {
        activeSubscriptions: data.data.active_subscriptions,
        totalSubscriptions: data.data.total_subscriptions,
        averageOpenRate: data.data.average_open_rate,
        averageClickRate: data.data.average_click_rate,
      };
    },
  };
}
