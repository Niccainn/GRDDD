/**
 * Nova tool registry — the contract between Claude's tool_use loop
 * and GRID's integration adapters.
 *
 * Each entry declares:
 *   - `schema` — the Anthropic tool schema Claude sees
 *   - `provider` — which Integration row must be CONNECTED in the env
 *   - `write` — true for side-effectful tools; gated per env policy
 *   - `handler` — runs the actual adapter call, returns a JSON-able result
 *
 * Adding a tool = one entry. The runner picks up the whole registry.
 */

import { getSlackClient } from '@/lib/integrations/clients/slack';
import { getNotionClient } from '@/lib/integrations/clients/notion';
import { getGitHubClient } from '@/lib/integrations/clients/github';
import { getFigmaClient } from '@/lib/integrations/clients/figma';

export type ToolContext = {
  environmentId: string;
  /** Per-provider integrationId, populated by the dispatcher. */
  integrationByProvider: Record<string, string>;
};

export type ToolSchema = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[]; items?: unknown }>;
    required?: string[];
  };
};

export type ToolEntry = {
  schema: ToolSchema;
  provider: 'slack' | 'notion' | 'github' | 'figma';
  write: boolean;
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

function requireIntegration(provider: ToolEntry['provider'], ctx: ToolContext): string {
  const id = ctx.integrationByProvider[provider];
  if (!id) {
    throw new Error(`${provider}:not_connected`);
  }
  return id;
}

export const TOOLS: Record<string, ToolEntry> = {
  'slack.listChannels': {
    provider: 'slack',
    write: false,
    schema: {
      name: 'slack_listChannels',
      description: 'List Slack channels the workspace can post to. Use to look up channel IDs before posting.',
      input_schema: { type: 'object', properties: { limit: { type: 'number', description: 'Max channels (default 20)' } } },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('slack', ctx);
      const client = await getSlackClient(id, ctx.environmentId);
      return client.listChannels(Number(input.limit ?? 20));
    },
  },
  'slack.postMessage': {
    provider: 'slack',
    write: true,
    schema: {
      name: 'slack_postMessage',
      description: 'Post a message to a Slack channel. Use the channel ID from slack_listChannels.',
      input_schema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Channel ID (e.g. C01234567)' },
          text: { type: 'string', description: 'Message markdown body' },
        },
        required: ['channelId', 'text'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('slack', ctx);
      const client = await getSlackClient(id, ctx.environmentId);
      return client.postMessage(String(input.channelId), String(input.text));
    },
  },

  'notion.searchPages': {
    provider: 'notion',
    write: false,
    schema: {
      name: 'notion_searchPages',
      description: 'Search Notion pages by title. Returns pages with IDs you can use for subsequent writes.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: ['query'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('notion', ctx);
      const client = await getNotionClient(id, ctx.environmentId);
      return client.searchPages(String(input.query), Number(input.limit ?? 10));
    },
  },
  'notion.createPage': {
    provider: 'notion',
    write: true,
    schema: {
      name: 'notion_createPage',
      description: 'Create a Notion page under a parent page.',
      input_schema: {
        type: 'object',
        properties: {
          parentPageId: { type: 'string', description: 'Parent page ID' },
          title: { type: 'string' },
          body: { type: 'string', description: 'Markdown body (optional)' },
        },
        required: ['parentPageId', 'title'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('notion', ctx);
      const client = await getNotionClient(id, ctx.environmentId);
      return client.createPage({
        parentPageId: String(input.parentPageId),
        title: String(input.title),
        body: input.body ? String(input.body) : undefined,
      });
    },
  },

  'github.listOpenIssues': {
    provider: 'github',
    write: false,
    schema: {
      name: 'github_listOpenIssues',
      description: 'List open GitHub issues for a repo.',
      input_schema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Org or user' },
          repo: { type: 'string', description: 'Repo name' },
          limit: { type: 'number', description: 'Max issues (default 20)' },
        },
        required: ['owner', 'repo'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('github', ctx);
      const client = await getGitHubClient(id, ctx.environmentId);
      return client.listOpenIssues(String(input.owner), String(input.repo), Number(input.limit ?? 20));
    },
  },
  'github.createIssueComment': {
    provider: 'github',
    write: true,
    schema: {
      name: 'github_createIssueComment',
      description: 'Comment on a GitHub issue or pull request.',
      input_schema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          issueNumber: { type: 'number' },
          body: { type: 'string', description: 'Comment markdown' },
        },
        required: ['owner', 'repo', 'issueNumber', 'body'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('github', ctx);
      const client = await getGitHubClient(id, ctx.environmentId);
      return client.createIssueComment(
        String(input.owner),
        String(input.repo),
        Number(input.issueNumber),
        String(input.body),
      );
    },
  },

  'figma.getFile': {
    provider: 'figma',
    write: false,
    schema: {
      name: 'figma_getFile',
      description: 'Fetch a Figma file by key. Returns top-level pages and metadata.',
      input_schema: {
        type: 'object',
        properties: {
          fileKey: { type: 'string', description: 'The file key from a Figma URL (figma.com/file/<KEY>/...)' },
        },
        required: ['fileKey'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('figma', ctx);
      const client = await getFigmaClient(id, ctx.environmentId);
      return client.getFile(String(input.fileKey));
    },
  },
  'figma.getTextContent': {
    provider: 'figma',
    write: false,
    schema: {
      name: 'figma_getTextContent',
      description: 'Extract all text nodes from a Figma file — useful for copy review.',
      input_schema: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
        },
        required: ['fileKey'],
      },
    },
    handler: async (input, ctx) => {
      const id = requireIntegration('figma', ctx);
      const client = await getFigmaClient(id, ctx.environmentId);
      return client.getTextContent(String(input.fileKey));
    },
  },
};

/** Claude names tools with underscores; we key on dotted IDs internally. */
export function toolSchemasForClaude(): ToolSchema[] {
  return Object.values(TOOLS).map(t => t.schema);
}

export function resolveToolByClaudeName(claudeName: string): { id: string; entry: ToolEntry } | null {
  for (const [id, entry] of Object.entries(TOOLS)) {
    if (entry.schema.name === claudeName) return { id, entry };
  }
  return null;
}
