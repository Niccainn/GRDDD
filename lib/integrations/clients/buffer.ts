/**
 * Buffer read client. Uses the Buffer v1 API with OAuth2 bearer
 * token auth for social media profiles and scheduled updates.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type BufferCreds = { accessToken: string };

const API_BASE = 'https://api.bufferapp.com/1';

export async function getBufferClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'buffer', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Buffer integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as BufferCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Buffer ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List connected social media profiles. */
    async listProfiles() {
      const data = await get<
        {
          id: string;
          service: string;
          service_username: string;
          formatted_username: string;
          counts: { sent: number; pending: number; drafts: number };
          default: boolean;
        }[]
      >('/profiles.json');
      return data.map(p => ({
        id: p.id,
        service: p.service,
        username: p.service_username,
        formattedUsername: p.formatted_username,
        sent: p.counts.sent,
        pending: p.counts.pending,
        drafts: p.counts.drafts,
      }));
    },

    /** Get pending and sent updates for a profile. */
    async getUpdates(profileId: string, limit = 20) {
      const data = await get<{
        updates: {
          id: string;
          text: string;
          status: string;
          created_at: number;
          sent_at: number;
          statistics: { reach?: number; clicks?: number; retweets?: number; favorites?: number };
        }[];
        total: number;
      }>(`/profiles/${profileId}/updates/sent.json?count=${limit}`);
      return {
        updates: data.updates.map(u => ({
          id: u.id,
          text: u.text,
          status: u.status,
          createdAt: new Date(u.created_at * 1000).toISOString(),
          sentAt: u.sent_at ? new Date(u.sent_at * 1000).toISOString() : null,
          reach: u.statistics.reach ?? 0,
          clicks: u.statistics.clicks ?? 0,
        })),
        total: data.total,
      };
    },
  };
}
