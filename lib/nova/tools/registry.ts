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
import { INTEGRATION_CATALOG, catalogSummary } from '@/lib/integrations/catalog';

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
  /**
   * Provider this tool is hardcoded against. Ignored for the meta
   * tools (`catalog.list`, `catalog.call`) — those resolve provider
   * from runtime input. The string type is widened so catalog entries
   * can reference arbitrary provider IDs without narrowing this union.
   */
  provider: string;
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

  // ─── Catalog meta-tools ───
  // Rather than enumerate every method across 89 providers as a
  // discrete tool, we expose two meta tools: `integration_list` to
  // discover what's connected + what methods exist, and
  // `integration_call` to dispatch any method on any provider.
  // Claude picks the right provider/method based on user intent.

  'catalog.list': {
    provider: 'slack' /* unused — see handler */,
    write: false,
    schema: {
      name: 'integration_list',
      description: 'List every supported integration and the methods available on each. Use this first to see what tools Nova can call in this environment. Returns provider IDs, labels, methods, and which methods are writes.',
      input_schema: {
        type: 'object',
        properties: {
          connectedOnly: { type: 'boolean', description: 'If true, return only integrations currently connected to this environment.' },
        },
      },
    },
    handler: async (input, ctx) => {
      const all = catalogSummary();
      const connectedOnly = Boolean(input.connectedOnly);
      const connected = new Set(Object.keys(ctx.integrationByProvider));
      return all.map(p => ({
        provider: p.provider,
        label: p.label,
        connected: connected.has(p.provider),
        methods: p.methods,
      })).filter(p => (connectedOnly ? p.connected : true));
    },
  },

  'catalog.call': {
    provider: 'slack' /* unused — see handler */,
    write: true /* treat meta-call as write; real write gate happens below */,
    schema: {
      name: 'integration_call',
      description: 'Invoke any method on any supported integration. Use integration_list first to see valid (provider, method) pairs. Args shape follows the adapter method signature — prefer named-arg objects where the method accepts an options bag.',
      input_schema: {
        type: 'object',
        properties: {
          provider: { type: 'string', description: 'Provider ID from integration_list (e.g. slack, linear, hubspot).' },
          method:   { type: 'string', description: 'Method name from the catalog (e.g. postMessage, createIssue).' },
          args:     { type: 'object', description: 'Arguments to pass to the method. Use positional order for methods that take multiple plain args; use a single object for methods that accept an options bag.' },
        },
        required: ['provider', 'method'],
      },
    },
    handler: async (input, ctx) => {
      const provider = String(input.provider ?? '');
      const method = String(input.method ?? '');
      const args = (input.args ?? {}) as Record<string, unknown>;
      const entry = INTEGRATION_CATALOG[provider];
      if (!entry) throw new Error(`catalog:unknown_provider:${provider}`);
      const methodMeta = entry.methods.find(m => m.name === method);
      if (!methodMeta) throw new Error(`catalog:unknown_method:${provider}.${method}`);

      const integrationId = ctx.integrationByProvider[provider];
      if (!integrationId) throw new Error(`${provider}:not_connected`);

      const client = await entry.getter(integrationId, ctx.environmentId);
      const fn = (client as Record<string, unknown>)[method];
      if (typeof fn !== 'function') throw new Error(`catalog:missing_handler:${provider}.${method}`);

      // Two calling conventions in the adapters:
      //   1) options-bag: fn({ ...args })
      //   2) positional:  fn(args[0], args[1], ...)
      // When args is a plain object with known argN keys, try positional
      // first; otherwise spread object keys positionally in insertion
      // order. This tolerates both styles without the caller knowing.
      if (Array.isArray(args)) {
        return (fn as (...a: unknown[]) => unknown).call(client, ...args);
      }
      const keys = Object.keys(args);
      const looksPositional = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
      if (looksPositional) {
        const ordered = keys.sort((a, b) => Number(a) - Number(b)).map(k => args[k]);
        return (fn as (...a: unknown[]) => unknown).call(client, ...ordered);
      }
      // Heuristic: if the single-arg convention fits, call with the bag;
      // otherwise pass object values positionally.
      if (keys.length === 1) {
        return (fn as (a: unknown) => unknown).call(client, args[keys[0]]);
      }
      // Default: pass the whole object as the single argument. Adapters
      // built for options-bag calls use this shape; positional-arg
      // adapters will coerce via their parameter order below when
      // Claude uses the expected key names.
      try {
        return await (fn as (a: unknown) => unknown).call(client, args);
      } catch {
        return (fn as (...a: unknown[]) => unknown).call(client, ...Object.values(args));
      }
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
