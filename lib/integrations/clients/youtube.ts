/**
 * YouTube read client. Uses the YouTube Data API v3 with OAuth2 bearer
 * token auth for channel statistics and recent video listings.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type YouTubeCreds = { accessToken: string };

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function getYouTubeClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'youtube', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('YouTube integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as YouTubeCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Get channel statistics for the authenticated user. */
    async getChannelStats() {
      const data = await get<{
        items: {
          id: string;
          snippet: { title: string; description: string; customUrl?: string };
          statistics: {
            subscriberCount: string;
            viewCount: string;
            videoCount: string;
            hiddenSubscriberCount: boolean;
          };
        }[];
      }>('/channels?part=snippet,statistics&mine=true');
      const ch = data.items[0];
      if (!ch) throw new Error('YouTube channel not found for authenticated user');
      return {
        id: ch.id,
        title: ch.snippet.title,
        customUrl: ch.snippet.customUrl ?? null,
        subscribers: parseInt(ch.statistics.subscriberCount, 10),
        totalViews: parseInt(ch.statistics.viewCount, 10),
        videoCount: parseInt(ch.statistics.videoCount, 10),
      };
    },

    /** List recent uploaded videos. */
    async listRecentVideos(limit = 10) {
      // First get the uploads playlist id
      const chData = await get<{
        items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
      }>('/channels?part=contentDetails&mine=true');
      const uploadsId = chData.items[0]?.contentDetails.relatedPlaylists.uploads;
      if (!uploadsId) throw new Error('YouTube uploads playlist not found');

      const data = await get<{
        items: {
          snippet: {
            resourceId: { videoId: string };
            title: string;
            publishedAt: string;
            thumbnails: { default?: { url: string } };
          };
        }[];
      }>(`/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${limit}`);
      return data.items.map(v => ({
        videoId: v.snippet.resourceId.videoId,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails.default?.url ?? null,
      }));
    },
  };
}
