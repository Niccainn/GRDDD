/**
 * Slack read client. Bot tokens don't expire so no refresh dance —
 * just decrypt and go. accountLabel stores the Slack team id.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SlackCreds = { accessToken: string };

export async function getSlackClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'slack', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Slack integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SlackCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function call<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`https://slack.com/api/${method}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers });
    const data = (await res.json()) as T & { ok: boolean; error?: string };
    if (!data.ok) throw new Error(`Slack ${method} failed: ${data.error ?? 'unknown'}`);
    return data;
  }

  return {
    integration,

    /** List public channels the bot is a member of. */
    async listChannels(limit = 50) {
      const data = await call<{
        channels: { id: string; name: string; num_members: number; is_member: boolean }[];
      }>('conversations.list', { exclude_archived: 'true', limit: String(limit) });
      return data.channels.map(c => ({ id: c.id, name: c.name, members: c.num_members, isMember: c.is_member }));
    },

    /**
     * Post a message to a Slack channel. WRITE — gated by Phase 5
     * approval layer; never call this from a read-only path.
     */
    async postMessage(channelId: string, text: string): Promise<{ ts: string; channel: string }> {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ channel: channelId, text }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
      if (!data.ok) throw new Error(`Slack chat.postMessage failed: ${data.error ?? 'unknown'}`);
      return { ts: data.ts ?? '', channel: data.channel ?? channelId };
    },

    /**
     * Reply in an existing thread. WRITE — Phase 6 approval-gated.
     * `threadTs` is the parent message timestamp from getChannelHistory.
     */
    async postThreadReply(channelId: string, threadTs: string, text: string): Promise<{ ts: string }> {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ channel: channelId, text, thread_ts: threadTs }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; ts?: string };
      if (!data.ok) throw new Error(`Slack thread reply failed: ${data.error ?? 'unknown'}`);
      return { ts: data.ts ?? '' };
    },

    /**
     * Add an emoji reaction to a message. WRITE — Phase 6 approval-gated.
     * `name` is a Slack emoji name without colons (e.g. "thumbsup").
     */
    async addReaction(channelId: string, messageTs: string, name: string): Promise<{ ok: true }> {
      const res = await fetch('https://slack.com/api/reactions.add', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ channel: channelId, timestamp: messageTs, name }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(`Slack reactions.add failed: ${data.error ?? 'unknown'}`);
      return { ok: true };
    },

    /** Fetch recent messages from a channel. */
    async getChannelHistory(channelId: string, limit = 20) {
      const data = await call<{
        messages: { ts: string; user?: string; text?: string; bot_id?: string }[];
      }>('conversations.history', { channel: channelId, limit: String(limit) });
      return data.messages.map(m => ({
        ts: m.ts,
        user: m.user ?? m.bot_id ?? null,
        text: m.text ?? '',
      }));
    },
  };
}
