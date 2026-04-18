/**
 * Slack sync fetcher.
 *
 * Pulls @mentions and DMs directed at the connected user since
 * `since`. We intentionally DON'T pull every channel message — that
 * would flood the inbox and Slack's search API rate-limits hard at
 * scale. Nova should see signal (things aimed at you), not noise.
 *
 * Slack tokens can be long-lived (xoxb-) or rotate (refresh-token
 * flow, opted in per app). We only fetch with the access token;
 * refresh is handled at the OAuth layer, not here.
 */

import { safeFetch } from '../clients/fetch-safe';
import type { Credentials, SyncItem } from './dispatcher';

type SlackSearchMatch = {
  ts: string; // Unix timestamp (seconds.microseconds) — Slack's event ID
  text: string;
  user: string;
  channel: { id: string; name: string };
  permalink: string;
};

type SlackSearchResponse = {
  ok: boolean;
  error?: string;
  messages?: { matches: SlackSearchMatch[]; total: number };
};

export async function syncSlack(creds: Credentials, since: Date): Promise<SyncItem[]> {
  // Slack's search.messages supports time filters in the query string.
  // We scope to mentions of the authenticated user — the token's own
  // user_id is resolved via auth.test so the query is correct.
  const authRes = await safeFetch<{ ok: boolean; user_id?: string }>(
    'https://slack.com/api/auth.test',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    },
  );
  if (!authRes.ok || !authRes.user_id) return [];

  const sinceEpoch = Math.floor(since.getTime() / 1000);
  const query = `@${authRes.user_id} after:${sinceEpoch}`;
  const params = new URLSearchParams({ query, count: '50', sort: 'timestamp' });

  const res = await safeFetch<SlackSearchResponse>(
    `https://slack.com/api/search.messages?${params}`,
    { headers: { Authorization: `Bearer ${creds.accessToken}` } },
  );
  if (!res.ok || !res.messages) return [];

  const items: SyncItem[] = [];
  for (const m of res.messages.matches) {
    const occurredAt = new Date(Number(m.ts) * 1000);
    if (occurredAt <= since) continue;
    items.push({
      sourceId: `slack:${m.channel.id}:${m.ts}`,
      title: `Mention in #${m.channel.name}`,
      body: m.text.slice(0, 500),
      priority: 'NORMAL',
      occurredAt,
      sourceUrl: m.permalink,
      metadata: { channelId: m.channel.id, authorSlackId: m.user },
    });
  }
  return items;
}
