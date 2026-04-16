/**
 * Loom read client. Uses Bearer auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://developer.loom.com/v1';

type LoomCreds = { accessToken: string };

export async function getLoomClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'loom', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Loom integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as LoomCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  return {
    integration,

    /** List videos owned by the authenticated user. */
    async listVideos(limit = 20) {
      const res = await fetch(`${API_BASE}/videos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ per_page: limit }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Loom error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { videos: { id: string; title: string; status: string; duration: number; thumbnail_url: string }[] };
    },

    /** Get details of a single video. */
    async getVideo(videoId: string) {
      const res = await fetch(`${API_BASE}/videos/${videoId}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Loom error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { id: string; title: string; status: string; duration: number; play_count: number; share_url: string };
    },
  };
}
