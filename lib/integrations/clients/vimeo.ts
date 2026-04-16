/**
 * Vimeo read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://api.vimeo.com';

type VimeoCreds = { accessToken: string };

export async function getVimeoClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'vimeo', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Vimeo integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as VimeoCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' };

  return {
    integration,

    /** List videos for the authenticated user. */
    async listVideos(limit = 20) {
      const res = await fetch(`${API_BASE}/me/videos?per_page=${limit}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Vimeo error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { data: { uri: string; name: string; duration: number; link: string; created_time: string; stats: { plays: number } }[] };
    },

    /** Get stats for a specific video. */
    async getVideoStats(videoId: string) {
      const res = await fetch(`${API_BASE}/videos/${videoId}?fields=uri,name,stats,duration,link`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Vimeo error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { uri: string; name: string; duration: number; link: string; stats: { plays: number } };
    },
  };
}
