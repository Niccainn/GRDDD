/**
 * Notion sync fetcher.
 *
 * Pulls pages updated since `since` across the user's entire Notion
 * workspace via the Search API, then converts each to a SyncItem.
 * 100-result cap per sync run — if the user genuinely has more than
 * 100 updates since last sync, the remainder rolls forward to the
 * next tick.
 *
 * Token refresh is not needed: Notion issues long-lived OAuth tokens
 * that don't expire. If the token becomes invalid (user revoked
 * access at the Notion side), the search call returns 401 and the
 * dispatcher marks the integration as needing reconnection.
 */

import { safeFetch } from '../clients/fetch-safe';
import type { Credentials, SyncItem } from './dispatcher';

type NotionSearchPage = {
  id: string;
  object: 'page' | 'database';
  url: string;
  last_edited_time: string;
  created_time: string;
  archived?: boolean;
  properties?: Record<string, unknown>;
};

type NotionSearchResponse = {
  results: NotionSearchPage[];
  has_more: boolean;
  next_cursor: string | null;
};

export async function syncNotion(creds: Credentials, since: Date): Promise<SyncItem[]> {
  // The Search API's sort option lets us request newest-first so we
  // can bail out of pagination as soon as we hit items older than
  // `since` — saves round trips for incremental syncs.
  const response = await safeFetch<NotionSearchResponse>('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 100,
    }),
  });

  const items: SyncItem[] = [];
  for (const page of response.results) {
    if (page.archived) continue;
    const editedAt = new Date(page.last_edited_time);
    if (editedAt <= since) break; // descending order — everything after is older

    items.push({
      sourceId: `notion:${page.id}`,
      title: extractNotionTitle(page) ?? 'Untitled',
      body: `Page last edited ${editedAt.toISOString()} — open in Notion to triage.`,
      priority: 'NORMAL',
      occurredAt: editedAt,
      sourceUrl: page.url,
      metadata: { notionObject: page.object },
    });
  }
  return items;
}

/**
 * Extract the first title-like property from a Notion page payload.
 * Notion's "title" lives under different keys depending on whether
 * the page is in a database (custom property name) or the workspace
 * root (always "title"). Return null when nothing readable is present.
 */
function extractNotionTitle(page: NotionSearchPage): string | null {
  const props = page.properties ?? {};
  for (const key of Object.keys(props)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = props[key] as any;
    if (prop?.type === 'title' && Array.isArray(prop.title) && prop.title.length > 0) {
      const text = prop.title
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => t?.plain_text ?? '')
        .join('')
        .trim();
      if (text) return text.slice(0, 200);
    }
  }
  return null;
}
