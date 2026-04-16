/**
 * Twitter / X read client. Uses the v2 API for authenticated user
 * info, recent tweets, and follower counts. OAuth2 user-context
 * bearer token auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TwitterCreds = { accessToken: string };

const API_BASE = 'https://api.twitter.com/2';

export async function getTwitterClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'twitter', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Twitter integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TwitterCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twitter ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Authenticated user profile. */
    async getMe() {
      const data = await get<{
        data: {
          id: string;
          name: string;
          username: string;
          profile_image_url: string;
          public_metrics: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
        };
      }>('/users/me?user.fields=profile_image_url,public_metrics');
      const u = data.data;
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        profileImageUrl: u.profile_image_url,
        followersCount: u.public_metrics.followers_count,
        followingCount: u.public_metrics.following_count,
        tweetCount: u.public_metrics.tweet_count,
      };
    },

    /** Recent tweets from the authenticated user. */
    async getRecentTweets(limit = 10) {
      const me = await get<{ data: { id: string } }>('/users/me');
      const userId = me.data.id;
      const data = await get<{
        data?: {
          id: string;
          text: string;
          created_at: string;
          public_metrics: { retweet_count: number; reply_count: number; like_count: number; impression_count: number };
        }[];
      }>(`/users/${userId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics`);
      return (data.data ?? []).map(t => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        retweetCount: t.public_metrics.retweet_count,
        replyCount: t.public_metrics.reply_count,
        likeCount: t.public_metrics.like_count,
        impressionCount: t.public_metrics.impression_count,
      }));
    },

    /** Follower count for the authenticated user. */
    async getFollowerCount() {
      const data = await get<{
        data: {
          id: string;
          public_metrics: { followers_count: number };
        };
      }>('/users/me?user.fields=public_metrics');
      return { followersCount: data.data.public_metrics.followers_count };
    },
  };
}
