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
      blocks: (
        | { type: string; text: string }
        | { type: 'image' | 'file' | 'embed' | 'bookmark'; url: string; caption?: string }
      )[];
    }): Promise<{ count: number }> {
      const textTypes = new Set([
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
      const mediaTypes = new Set(['image', 'file', 'embed', 'bookmark']);

      const children = args.blocks.map(b => {
        if ('url' in b && mediaTypes.has(b.type)) {
          const mb = b as { type: 'image' | 'file' | 'embed' | 'bookmark'; url: string; caption?: string };
          const captionRt = mb.caption
            ? [{ type: 'text', text: { content: mb.caption } }]
            : [];
          if (mb.type === 'image') {
            return {
              object: 'block',
              type: 'image',
              image: { type: 'external', external: { url: mb.url }, caption: captionRt },
            };
          }
          if (mb.type === 'file') {
            return {
              object: 'block',
              type: 'file',
              file: { type: 'external', external: { url: mb.url }, caption: captionRt },
            };
          }
          if (mb.type === 'embed') {
            return { object: 'block', type: 'embed', embed: { url: mb.url, caption: captionRt } };
          }
          // bookmark
          return { object: 'block', type: 'bookmark', bookmark: { url: mb.url, caption: captionRt } };
        }

        const tb = b as { type: string; text: string };
        const type = textTypes.has(tb.type) ? tb.type : 'paragraph';
        const richText = [{ type: 'text', text: { content: tb.text } }];
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

    /**
     * Fetch a page's metadata plus its first page of text blocks,
     * flattened into a plain-text excerpt. READ — safe to run inside
     * a reasoning step without approval.
     */
    async fetchPage(args: { pageId: string; maxBlocks?: number; maxChars?: number }) {
      const maxBlocks = args.maxBlocks ?? 40;
      const maxChars = args.maxChars ?? 6000;

      const pageRes = await fetch(`${API_BASE}/pages/${args.pageId}`, { headers });
      if (!pageRes.ok) {
        const text = await pageRes.text();
        throw new Error(`Notion fetchPage (page) failed (${pageRes.status}): ${text.slice(0, 200)}`);
      }
      const page = (await pageRes.json()) as {
        id: string;
        url: string;
        last_edited_time: string;
        properties?: Record<string, unknown>;
      };

      // Extract a human-readable title from the properties bag.
      let title = 'Untitled';
      for (const value of Object.values(page.properties ?? {})) {
        const v = value as { type?: string; title?: { plain_text?: string }[] };
        if (v?.type === 'title' && Array.isArray(v.title) && v.title.length > 0) {
          title = v.title.map(t => t.plain_text ?? '').join('').trim() || title;
          break;
        }
      }

      const blocksRes = await fetch(
        `${API_BASE}/blocks/${args.pageId}/children?page_size=${maxBlocks}`,
        { headers },
      );
      if (!blocksRes.ok) {
        const text = await blocksRes.text();
        throw new Error(`Notion fetchPage (blocks) failed (${blocksRes.status}): ${text.slice(0, 200)}`);
      }
      const blockData = (await blocksRes.json()) as {
        results: Array<{ type: string } & Record<string, unknown>>;
      };

      const lines: string[] = [];
      const richTextTypes = [
        'paragraph',
        'heading_1',
        'heading_2',
        'heading_3',
        'bulleted_list_item',
        'numbered_list_item',
        'to_do',
        'quote',
        'code',
        'callout',
      ];
      for (const block of blockData.results) {
        const t = block.type;
        if (!richTextTypes.includes(t)) continue;
        const bag = (block as Record<string, unknown>)[t] as
          | { rich_text?: Array<{ plain_text?: string }> }
          | undefined;
        const text = (bag?.rich_text ?? [])
          .map(r => r.plain_text ?? '')
          .join('')
          .trim();
        if (!text) continue;
        if (t.startsWith('heading')) lines.push(`\n## ${text}`);
        else if (t === 'bulleted_list_item') lines.push(`• ${text}`);
        else if (t === 'numbered_list_item') lines.push(`1. ${text}`);
        else if (t === 'to_do') lines.push(`☐ ${text}`);
        else lines.push(text);
      }
      let excerpt = lines.join('\n').trim();
      if (excerpt.length > maxChars) {
        excerpt = excerpt.slice(0, maxChars) + '…';
      }

      return {
        id: page.id,
        url: page.url,
        title,
        lastEdited: page.last_edited_time,
        excerpt,
        blockCount: blockData.results.length,
      };
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
