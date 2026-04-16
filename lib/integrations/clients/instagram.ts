/**
 * Instagram read client. Uses the Meta Graph API (v20.0) for
 * profile info, recent media, and account insights. Bearer token
 * auth via Instagram Business / Creator token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type InstagramCreds = { accessToken: string };

const API_BASE = 'https://graph.instagram.com/v20.0';

export async function getInstagramClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'instagram', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Instagram integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as InstagramCreds;

  async function get<T>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${API_BASE}${path}${separator}access_token=${creds.accessToken}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Instagram ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Authenticated user profile. */
    async getProfile() {
      const data = await get<{
        id: string;
        username: string;
        name: string;
        biography: string;
        followers_count: number;
        follows_count: number;
        media_count: number;
        profile_picture_url: string;
      }>('/me?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url');
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        biography: data.biography,
        followersCount: data.followers_count,
        followsCount: data.follows_count,
        mediaCount: data.media_count,
        profilePictureUrl: data.profile_picture_url,
      };
    },

    /** Recent media posts. */
    async getRecentMedia(limit = 25) {
      const data = await get<{
        data: {
          id: string;
          caption?: string;
          media_type: string;
          media_url: string;
          permalink: string;
          timestamp: string;
          like_count?: number;
          comments_count?: number;
        }[];
      }>(`/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}`);
      return data.data.map(m => ({
        id: m.id,
        caption: m.caption ?? null,
        mediaType: m.media_type,
        mediaUrl: m.media_url,
        permalink: m.permalink,
        timestamp: m.timestamp,
        likeCount: m.like_count ?? 0,
        commentsCount: m.comments_count ?? 0,
      }));
    },

    /** Account-level insights (impressions, reach, profile views) for the last 30 days. */
    async getInsights() {
      const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const until = Math.floor(Date.now() / 1000);
      const data = await get<{
        data: {
          name: string;
          period: string;
          values: { value: number; end_time: string }[];
        }[];
      }>(`/me/insights?metric=impressions,reach,profile_views&period=day&since=${since}&until=${until}`);
      return data.data.map(metric => ({
        name: metric.name,
        period: metric.period,
        values: metric.values.map(v => ({
          value: v.value,
          endTime: v.end_time,
        })),
      }));
    },
  };
}
