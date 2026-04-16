/**
 * Discord read client. Uses the Discord API v10 with bot token
 * authentication for guilds, channels, and messages.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type DiscordCreds = { accessToken: string };

const API_BASE = 'https://discord.com/api/v10';

export async function getDiscordClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'discord', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Discord integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as DiscordCreds;
  const headers = { Authorization: `Bot ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List guilds (servers) the bot is a member of. */
    async listGuilds() {
      const data = await get<
        { id: string; name: string; icon: string | null; owner: boolean; member_count?: number }[]
      >('/users/@me/guilds');
      return data.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        isOwner: g.owner,
      }));
    },

    /** List channels in a guild. */
    async listChannels(guildId: string) {
      const data = await get<
        { id: string; name: string; type: number; position: number; parent_id: string | null }[]
      >(`/guilds/${guildId}/channels`);
      return data.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        position: c.position,
        parentId: c.parent_id,
      }));
    },

    /** Get recent messages from a channel. */
    async getRecentMessages(channelId: string, limit = 20) {
      const data = await get<
        {
          id: string;
          content: string;
          timestamp: string;
          author: { id: string; username: string; discriminator: string };
        }[]
      >(`/channels/${channelId}/messages?limit=${limit}`);
      return data.map(m => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        authorId: m.author.id,
        authorName: m.author.username,
      }));
    },
  };
}
