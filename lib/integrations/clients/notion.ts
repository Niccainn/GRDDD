/**
 * Notion read client. Uses the v1 REST API with the fixed
 * Notion-Version header (2022-06-28). accountLabel stores the
 * workspace id.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type NotionCreds = { accessToken: string };
const API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export async function getNotionClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'notion', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Notion integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as NotionCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Search pages the integration has been granted access to. */
    async searchPages(query: string, limit = 20) {
      const data = await post<{
        results: { id: string; object: string; properties?: Record<string, unknown>; url: string; last_edited_time: string }[];
      }>('/search', {
        query,
        filter: { property: 'object', value: 'page' },
        page_size: limit,
      });
      return data.results.map(r => ({ id: r.id, url: r.url, lastEdited: r.last_edited_time }));
    },

    /**
     * Create a new page under a given parent page. WRITE — Phase 5
     * approval-gated. Body is a single plain-text paragraph; richer
     * blocks are a Phase 6 concern.
     */
    async createPage(args: { parentPageId: string; title: string; body?: string }) {
      const payload = {
        parent: { page_id: args.parentPageId },
        properties: {
          title: { title: [{ type: 'text', text: { content: args.title } }] },
        },
        children: args.body
          ? [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: args.body } }],
                },
              },
            ]
          : [],
      };
      const data = await post<{ id: string; url: string }>('/pages', payload);
      return { id: data.id, url: data.url };
    },

    /**
     * Append rich blocks to an existing Notion page. WRITE — Phase 6
     * approval-gated. Accepts an ordered list of {type, text} pairs and
     * fans them out into the corresponding Notion block shape. Supported
     * types: paragraph, heading_1, heading_2, heading_3, bulleted_list_item,
     * numbered_list_item, to_do, quote, code.
     */
    async appendBlocks(args: {
      pageId: string;
      blocks: { type: string; text: string }[];
    }): Promise<{ count: number }> {
      const supported = new Set([
        'paragraph',
        'heading_1',
        'heading_2',
        'heading_3',
        'bulleted_list_item',
        'numbered_list_item',
        'to_do',
        'quote',
        'code',
      ]);
      const children = args.blocks.map(b => {
        const type = supported.has(b.type) ? b.type : 'paragraph';
        const richText = [{ type: 'text', text: { content: b.text } }];
        if (type === 'code') {
          return { object: 'block', type, code: { rich_text: richText, language: 'plain text' } };
        }
        if (type === 'to_do') {
          return { object: 'block', type, to_do: { rich_text: richText, checked: false } };
        }
        return { object: 'block', type, [type]: { rich_text: richText } };
      });
      const res = await fetch(`${API_BASE}/blocks/${args.pageId}/children`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ children }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Notion appendBlocks failed (${res.status}): ${text.slice(0, 200)}`);
      }
      return { count: children.length };
    },

    /** List databases the integration has been granted access to. */
    async listDatabases(limit = 20) {
      const data = await post<{
        results: { id: string; title: { plain_text: string }[]; url: string; last_edited_time: string }[];
      }>('/search', {
        filter: { property: 'object', value: 'database' },
        page_size: limit,
      });
      return data.results.map(r => ({
        id: r.id,
        title: r.title.map(t => t.plain_text).join(''),
        url: r.url,
        lastEdited: r.last_edited_time,
      }));
    },
  };
}
