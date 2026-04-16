/**
 * TikTok read client. Uses the TikTok API v2 with OAuth2 bearer
 * token auth for user info and recent video listings.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TikTokCreds = { accessToken: string };

const API_BASE = 'https://open.tiktokapis.com/v2';

export async function getTikTokClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'tiktok', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('TikTok integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TikTokCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TikTok ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TikTok ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Get info about the authenticated user. */
    async getUserInfo() {
      const data = await get<{
        data: {
          user: {
            open_id: string;
            display_name: string;
            avatar_url: string;
            follower_count: number;
            following_count: number;
            likes_count: number;
            video_count: number;
          };
        };
      }>('/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count');
      const u = data.data.user;
      return {
        openId: u.open_id,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        followers: u.follower_count,
        following: u.following_count,
        likes: u.likes_count,
        videoCount: u.video_count,
      };
    },

    /** Get recent videos from the authenticated user. */
    async getRecentVideos(limit = 20) {
      const data = await post<{
        data: {
          videos: {
            id: string;
            title: string;
            create_time: number;
            cover_image_url: string;
            like_count: number;
            comment_count: number;
            share_count: number;
            view_count: number;
          }[];
        };
      }>('/video/list/', {
        max_count: limit,
        fields: ['id', 'title', 'create_time', 'cover_image_url', 'like_count', 'comment_count', 'share_count', 'view_count'],
      });
      return data.data.videos.map(v => ({
        id: v.id,
        title: v.title,
        createdAt: new Date(v.create_time * 1000).toISOString(),
        coverImageUrl: v.cover_image_url,
        likes: v.like_count,
        comments: v.comment_count,
        shares: v.share_count,
        views: v.view_count,
      }));
    },
  };
}
