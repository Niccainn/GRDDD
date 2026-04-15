/**
 * Agent tool registry — the bridge between Claude's tool_use API and
 * the Grid integration clients. Each tool entry declares:
 *
 *   - `name`: the Claude-visible tool name (must match ^[a-zA-Z0-9_-]+$)
 *   - `provider`: the Integration.provider slug this tool needs
 *   - `description`: one-paragraph guidance the model sees when
 *     deciding whether to call this tool
 *   - `inputSchema`: JSON schema the model must match to invoke
 *   - `execute(integration, args)`: runs the call against the decrypted
 *     client and returns a JSON-serializable result. Errors should
 *     throw — the runner catches them and returns them as tool_result
 *     with `is_error: true` so Claude can recover gracefully.
 *
 * Phase 3 ships READ tools only. Writes (pause campaign, update DNS,
 * send Slack message, post to Notion) live in a sibling file in Phase
 * 5 and go through the explicit-permission layer.
 *
 * How the agent runner uses this:
 *   1. On every run, list ACTIVE integrations in the agent's env.
 *   2. For each provider found, include its tools in the Anthropic
 *      `tools` parameter. Claude automatically decides which to call
 *      based on the agent's prompt.
 *   3. When Claude returns `stop_reason: "tool_use"`, execute each
 *      requested tool via this registry and feed results back.
 *
 * Multi-account note: if an environment has two ACTIVE Meta Ads
 * integrations (two ad accounts), we currently expose the tools
 * once, pointing at whichever integration comes first. The agent
 * runner's loader picks the primary. Multi-account selection gets
 * a dedicated `integration_id` parameter in Phase 4.
 */

import type { Integration } from '@prisma/client';
import { getCloudflareClient } from './clients/cloudflare';
import { getMetaAdsClient } from './clients/meta-ads';
import { getGoogleAdsClient } from './clients/google-ads';
import { getGoogleAnalyticsClient } from './clients/google-analytics';
import { getGoogleSearchConsoleClient } from './clients/google-search-console';
import { getGoogleWorkspaceClient } from './clients/google-workspace';
import { getSalesforceClient } from './clients/salesforce';
import { getHubSpotClient } from './clients/hubspot';
import { getSlackClient } from './clients/slack';
import { getGitHubClient } from './clients/github';
import { getLinearClient } from './clients/linear';
import { getNotionClient } from './clients/notion';
import { getStripeClient } from './clients/stripe';
import { getShopifyClient } from './clients/shopify';
import { getFigmaClient } from './clients/figma';

export type ToolInputSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
};

export type AgentTool = {
  name: string;
  provider: string; // matches Integration.provider
  description: string;
  inputSchema: ToolInputSchema;
  /**
   * Execute the tool against a loaded Integration row. Throws on any
   * failure — the runner converts thrown errors into tool_result with
   * is_error: true so Claude can recover.
   */
  execute: (integration: Integration, args: Record<string, unknown>) => Promise<unknown>;

  /**
   * Phase 5 — write-path flag. When true, the agent runner does NOT
   * execute the tool inline. Instead it persists a PendingAction row,
   * pauses the run at AWAITING_APPROVAL, and waits for the user to
   * click approve in the UI. The resume helper then calls execute()
   * and feeds the result back into Claude's conversation.
   */
  mutating?: boolean;

  /**
   * Phase 5 — human-readable summary used on the approval card. The
   * summarizer must work without hitting any network so the UI can
   * render it instantly. Default is `${name}(${JSON.stringify(args)})`.
   */
  summarize?: (args: Record<string, unknown>, integration: Integration) => string;
};

export const TOOLS: AgentTool[] = [
  // ── Cloudflare ────────────────────────────────────────────────────
  {
    name: 'cloudflare_list_zones',
    provider: 'cloudflare',
    description:
      'List Cloudflare zones (domains) accessible with the connected token. Returns up to 50 zones with their id, name, and status. Call this FIRST if you need a zone id for other Cloudflare tools.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async execute(integration) {
      const { listZones } = await getCloudflareClient(integration.id, integration.environmentId);
      return { zones: await listZones(50) };
    },
  },
  {
    name: 'cloudflare_zone_analytics_24h',
    provider: 'cloudflare',
    description:
      'Fetch 24-hour traffic analytics for a Cloudflare zone: total requests, bandwidth (bytes), cached requests, and blocked threats. Input the zone id from cloudflare_list_zones.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Cloudflare zone id (NOT the domain name)' },
      },
      required: ['zone_id'],
    },
    async execute(integration, args) {
      const zoneId = String(args.zone_id ?? '');
      if (!zoneId) throw new Error('zone_id is required');
      const { zoneAnalytics24h } = await getCloudflareClient(integration.id, integration.environmentId);
      return await zoneAnalytics24h(zoneId);
    },
  },

  // ── Meta Ads ──────────────────────────────────────────────────────
  {
    name: 'meta_ads_get_account_totals',
    provider: 'meta_ads',
    description:
      'Fetch aggregate ad account performance for a date range: spend, impressions, clicks, CTR, and purchase ROAS. Use this when you need top-line ad metrics for a briefing or review.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: {
          type: 'string',
          enum: ['yesterday', 'last_7d', 'last_30d'],
          description: 'Which Meta-canonical date range to query. Default: yesterday.',
        },
      },
    },
    async execute(integration, args) {
      const { getAccountTotals } = await getMetaAdsClient(integration.id, integration.environmentId);
      const preset = (args.date_preset as 'yesterday' | 'last_7d' | 'last_30d' | undefined) ?? 'yesterday';
      return await getAccountTotals({ datePreset: preset });
    },
  },
  {
    name: 'meta_ads_get_campaign_breakdown',
    provider: 'meta_ads',
    description:
      'Fetch per-campaign performance (spend, impressions, clicks, CTR, CPC, purchase ROAS) for a date range. Use this when you need to identify top/bottom campaigns for pause or scale recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: {
          type: 'string',
          enum: ['yesterday', 'last_7d', 'last_30d'],
        },
        limit: { type: 'number', description: 'Max campaigns to return. Default: 25.' },
      },
    },
    async execute(integration, args) {
      const { getCampaignInsights } = await getMetaAdsClient(integration.id, integration.environmentId);
      const preset = (args.date_preset as 'yesterday' | 'last_7d' | 'last_30d' | undefined) ?? 'yesterday';
      const limit = typeof args.limit === 'number' ? args.limit : 25;
      return await getCampaignInsights({ datePreset: preset, limit });
    },
  },

  // ── Google Ads ────────────────────────────────────────────────────
  {
    name: 'google_ads_get_account_totals',
    provider: 'google_ads',
    description:
      'Fetch Google Ads account totals (spend, impressions, clicks, CTR, CPC, conversions) over yesterday / last 7 / last 30 days.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS'] },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleAdsClient(integration.id, integration.environmentId);
      return await client.getAccountTotals((args.date_preset as 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS') ?? 'LAST_7_DAYS');
    },
  },
  {
    name: 'google_ads_get_campaign_breakdown',
    provider: 'google_ads',
    description:
      'Fetch per-campaign Google Ads performance (spend, impressions, clicks, conversions) for a date range. Identify top/bottom performers.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS'] },
        limit: { type: 'number' },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleAdsClient(integration.id, integration.environmentId);
      return await client.getCampaignBreakdown(
        (args.date_preset as 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS') ?? 'LAST_7_DAYS',
        typeof args.limit === 'number' ? args.limit : 25,
      );
    },
  },

  // ── Google Analytics (GA4) ────────────────────────────────────────
  {
    name: 'google_analytics_get_traffic_totals',
    provider: 'google_analytics',
    description:
      'Fetch GA4 site-wide traffic totals (active users, sessions, pageviews, bounce rate, avg session duration) for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['yesterday', 'last7Days', 'last30Days'] },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleAnalyticsClient(integration.id, integration.environmentId);
      return await client.getTrafficTotals((args.date_preset as 'yesterday' | 'last7Days' | 'last30Days') ?? 'last7Days');
    },
  },
  {
    name: 'google_analytics_get_top_pages',
    provider: 'google_analytics',
    description: 'Fetch the top GA4 pages by pageviews with user counts.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['yesterday', 'last7Days', 'last30Days'] },
        limit: { type: 'number' },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleAnalyticsClient(integration.id, integration.environmentId);
      return await client.getTopPages(
        (args.date_preset as 'yesterday' | 'last7Days' | 'last30Days') ?? 'last7Days',
        typeof args.limit === 'number' ? args.limit : 10,
      );
    },
  },

  // ── Google Search Console ─────────────────────────────────────────
  {
    name: 'google_search_console_get_totals',
    provider: 'google_search_console',
    description:
      'Fetch site-wide organic search totals (clicks, impressions, CTR, avg position) from Search Console.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['last7Days', 'last28Days'] },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleSearchConsoleClient(integration.id, integration.environmentId);
      return await client.getTotals((args.date_preset as 'last7Days' | 'last28Days') ?? 'last7Days');
    },
  },
  {
    name: 'google_search_console_get_top_queries',
    provider: 'google_search_console',
    description: 'Fetch top organic search queries for a site by click volume.',
    inputSchema: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', enum: ['last7Days', 'last28Days'] },
        limit: { type: 'number' },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleSearchConsoleClient(integration.id, integration.environmentId);
      return await client.getTopQueries(
        (args.date_preset as 'last7Days' | 'last28Days') ?? 'last7Days',
        typeof args.limit === 'number' ? args.limit : 20,
      );
    },
  },

  // ── Google Workspace ──────────────────────────────────────────────
  {
    name: 'google_workspace_gmail_unread',
    provider: 'google_workspace',
    description: 'Count unread Gmail threads in the primary inbox.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getGoogleWorkspaceClient(integration.id, integration.environmentId);
      return await client.gmailUnreadCount();
    },
  },
  {
    name: 'google_workspace_upcoming_events',
    provider: 'google_workspace',
    description: 'List upcoming Google Calendar events in the next N days.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'How many days ahead to look. Default: 7.' },
        limit: { type: 'number' },
      },
    },
    async execute(integration, args) {
      const client = await getGoogleWorkspaceClient(integration.id, integration.environmentId);
      return await client.listUpcomingEvents(
        typeof args.days === 'number' ? args.days : 7,
        typeof args.limit === 'number' ? args.limit : 10,
      );
    },
  },

  // ── Salesforce ────────────────────────────────────────────────────
  {
    name: 'salesforce_pipeline_by_stage',
    provider: 'salesforce',
    description:
      'Fetch Salesforce pipeline totals grouped by stage: count of open opportunities and total amount per stage.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getSalesforceClient(integration.id, integration.environmentId);
      return await client.getPipelineByStage();
    },
  },
  {
    name: 'salesforce_top_open_opportunities',
    provider: 'salesforce',
    description: 'Fetch the largest open Salesforce opportunities by amount.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number' } },
    },
    async execute(integration, args) {
      const client = await getSalesforceClient(integration.id, integration.environmentId);
      return await client.getTopOpenOpportunities(typeof args.limit === 'number' ? args.limit : 10);
    },
  },

  // ── HubSpot ───────────────────────────────────────────────────────
  {
    name: 'hubspot_recent_contacts',
    provider: 'hubspot',
    description: 'Fetch recently modified HubSpot contacts with email, name, and lifecycle stage.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getHubSpotClient(integration.id, integration.environmentId);
      return await client.getRecentContacts(typeof args.limit === 'number' ? args.limit : 20);
    },
  },
  {
    name: 'hubspot_open_deals',
    provider: 'hubspot',
    description: 'Fetch top HubSpot deals by amount, sorted descending.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getHubSpotClient(integration.id, integration.environmentId);
      return await client.getOpenDeals(typeof args.limit === 'number' ? args.limit : 50);
    },
  },

  // ── Slack ─────────────────────────────────────────────────────────
  {
    name: 'slack_list_channels',
    provider: 'slack',
    description: 'List Slack channels the bot has access to, with member counts.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getSlackClient(integration.id, integration.environmentId);
      return await client.listChannels(typeof args.limit === 'number' ? args.limit : 50);
    },
  },
  {
    name: 'slack_channel_history',
    provider: 'slack',
    description: 'Fetch recent messages from a Slack channel by channel id.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'Slack channel id (e.g. C0123456)' },
        limit: { type: 'number' },
      },
      required: ['channel_id'],
    },
    async execute(integration, args) {
      const client = await getSlackClient(integration.id, integration.environmentId);
      return await client.getChannelHistory(
        String(args.channel_id ?? ''),
        typeof args.limit === 'number' ? args.limit : 20,
      );
    },
  },

  // ── GitHub ────────────────────────────────────────────────────────
  {
    name: 'github_list_repos',
    provider: 'github',
    description: 'List GitHub repositories for the authenticated user, sorted by recent activity.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getGitHubClient(integration.id, integration.environmentId);
      return await client.listRepos(typeof args.limit === 'number' ? args.limit : 30);
    },
  },
  {
    name: 'github_list_open_issues',
    provider: 'github',
    description: 'List open issues for a given repository (owner/repo).',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['owner', 'repo'],
    },
    async execute(integration, args) {
      const client = await getGitHubClient(integration.id, integration.environmentId);
      return await client.listOpenIssues(
        String(args.owner ?? ''),
        String(args.repo ?? ''),
        typeof args.limit === 'number' ? args.limit : 20,
      );
    },
  },

  // ── Linear ────────────────────────────────────────────────────────
  {
    name: 'linear_my_open_issues',
    provider: 'linear',
    description: 'List open Linear issues assigned to the authenticated user.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getLinearClient(integration.id, integration.environmentId);
      return await client.getMyOpenIssues(typeof args.limit === 'number' ? args.limit : 25);
    },
  },
  {
    name: 'linear_team_issue_counts',
    provider: 'linear',
    description: 'Fetch issue counts per state type for each Linear team.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getLinearClient(integration.id, integration.environmentId);
      return await client.getTeamIssueCounts();
    },
  },

  // ── Notion ────────────────────────────────────────────────────────
  {
    name: 'notion_search_pages',
    provider: 'notion',
    description:
      'Search Notion pages the integration has access to. Returns page ids, URLs, and last-edited timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search query' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
    async execute(integration, args) {
      const client = await getNotionClient(integration.id, integration.environmentId);
      return await client.searchPages(
        String(args.query ?? ''),
        typeof args.limit === 'number' ? args.limit : 20,
      );
    },
  },
  {
    name: 'notion_list_databases',
    provider: 'notion',
    description: 'List Notion databases the integration has been granted access to.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getNotionClient(integration.id, integration.environmentId);
      return await client.listDatabases(typeof args.limit === 'number' ? args.limit : 20);
    },
  },

  // ── Stripe ────────────────────────────────────────────────────────
  {
    name: 'stripe_get_balance',
    provider: 'stripe',
    description: 'Fetch Stripe account available + pending balance across currencies.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getStripeClient(integration.id, integration.environmentId);
      return await client.getBalance();
    },
  },
  {
    name: 'stripe_get_active_subscriptions',
    provider: 'stripe',
    description: 'Fetch active Stripe subscription count and approximate MRR.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getStripeClient(integration.id, integration.environmentId);
      return await client.getActiveSubscriptions();
    },
  },
  {
    name: 'stripe_get_recent_charges',
    provider: 'stripe',
    description: 'Fetch recent Stripe charges with amount, currency, status, and description.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getStripeClient(integration.id, integration.environmentId);
      return await client.getRecentCharges(typeof args.limit === 'number' ? args.limit : 20);
    },
  },

  // ── Slack — WRITE (Phase 5) ───────────────────────────────────────
  {
    name: 'slack_post_message',
    provider: 'slack',
    mutating: true,
    description:
      'Post a plain-text or markdown message to a Slack channel. WRITE — requires human approval before execution. Use channel ids from slack_list_channels.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'Slack channel id (e.g. C0123456)' },
        text: { type: 'string', description: 'Message body. Slack mrkdwn supported.' },
      },
      required: ['channel_id', 'text'],
    },
    summarize(args) {
      const text = String(args.text ?? '');
      const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
      return `Post to Slack channel ${args.channel_id}: "${preview}"`;
    },
    async execute(integration, args) {
      const client = await getSlackClient(integration.id, integration.environmentId);
      return await client.postMessage(String(args.channel_id ?? ''), String(args.text ?? ''));
    },
  },

  // ── Linear — WRITE (Phase 5) ──────────────────────────────────────
  {
    name: 'linear_create_issue',
    provider: 'linear',
    mutating: true,
    description:
      'Create a new Linear issue under a given team. WRITE — requires human approval. Get team ids from linear_team_issue_counts.',
    inputSchema: {
      type: 'object',
      properties: {
        team_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', description: 'Markdown body. Optional.' },
      },
      required: ['team_id', 'title'],
    },
    summarize(args) {
      return `Create Linear issue "${args.title}" in team ${args.team_id}`;
    },
    async execute(integration, args) {
      const client = await getLinearClient(integration.id, integration.environmentId);
      return await client.createIssue({
        teamId: String(args.team_id ?? ''),
        title: String(args.title ?? ''),
        description: typeof args.description === 'string' ? args.description : undefined,
      });
    },
  },

  // ── GitHub — WRITE (Phase 5) ──────────────────────────────────────
  {
    name: 'github_create_issue_comment',
    provider: 'github',
    mutating: true,
    description:
      'Post a comment on an existing GitHub issue or pull request. WRITE — requires human approval.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        issue_number: { type: 'number' },
        body: { type: 'string' },
      },
      required: ['owner', 'repo', 'issue_number', 'body'],
    },
    summarize(args) {
      const body = String(args.body ?? '');
      const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
      return `Comment on ${args.owner}/${args.repo}#${args.issue_number}: "${preview}"`;
    },
    async execute(integration, args) {
      const client = await getGitHubClient(integration.id, integration.environmentId);
      return await client.createIssueComment(
        String(args.owner ?? ''),
        String(args.repo ?? ''),
        Number(args.issue_number ?? 0),
        String(args.body ?? ''),
      );
    },
  },

  // ── Notion — WRITE (Phase 5) ──────────────────────────────────────
  {
    name: 'notion_create_page',
    provider: 'notion',
    mutating: true,
    description:
      'Create a new Notion page under a given parent page. WRITE — requires human approval. Use parent page ids from notion_search_pages.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_page_id: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string', description: 'Optional plain-text body paragraph.' },
      },
      required: ['parent_page_id', 'title'],
    },
    summarize(args) {
      return `Create Notion page "${args.title}" under ${args.parent_page_id}`;
    },
    async execute(integration, args) {
      const client = await getNotionClient(integration.id, integration.environmentId);
      return await client.createPage({
        parentPageId: String(args.parent_page_id ?? ''),
        title: String(args.title ?? ''),
        body: typeof args.body === 'string' ? args.body : undefined,
      });
    },
  },

  // ── Slack — WRITE Phase 6 ─────────────────────────────────────────
  {
    name: 'slack_post_thread_reply',
    provider: 'slack',
    mutating: true,
    description:
      'Reply in an existing Slack thread. WRITE — requires human approval. Use the parent message ts from slack_channel_history.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: { type: 'string' },
        thread_ts: { type: 'string', description: 'Parent message ts (timestamp).' },
        text: { type: 'string' },
      },
      required: ['channel_id', 'thread_ts', 'text'],
    },
    summarize(args) {
      const text = String(args.text ?? '');
      const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
      return `Reply in Slack thread on #${args.channel_id}: "${preview}"`;
    },
    async execute(integration, args) {
      const client = await getSlackClient(integration.id, integration.environmentId);
      return await client.postThreadReply(
        String(args.channel_id ?? ''),
        String(args.thread_ts ?? ''),
        String(args.text ?? ''),
      );
    },
  },
  {
    name: 'slack_add_reaction',
    provider: 'slack',
    mutating: true,
    description:
      'Add an emoji reaction to a Slack message. WRITE — requires human approval. Emoji name is the colon-less form (e.g. "thumbsup", "white_check_mark").',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: { type: 'string' },
        message_ts: { type: 'string' },
        name: { type: 'string', description: 'Emoji name without colons.' },
      },
      required: ['channel_id', 'message_ts', 'name'],
    },
    summarize(args) {
      return `React :${args.name}: on Slack message ${args.message_ts} in #${args.channel_id}`;
    },
    async execute(integration, args) {
      const client = await getSlackClient(integration.id, integration.environmentId);
      return await client.addReaction(
        String(args.channel_id ?? ''),
        String(args.message_ts ?? ''),
        String(args.name ?? ''),
      );
    },
  },

  // ── Linear — WRITE Phase 6 ────────────────────────────────────────
  {
    name: 'linear_add_comment',
    provider: 'linear',
    mutating: true,
    description:
      'Add a comment to an existing Linear issue. WRITE — requires human approval. issue_id is the Linear issue id (UUID), not the human identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'string' },
        body: { type: 'string', description: 'Markdown body.' },
      },
      required: ['issue_id', 'body'],
    },
    summarize(args) {
      const body = String(args.body ?? '');
      const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
      return `Comment on Linear issue ${args.issue_id}: "${preview}"`;
    },
    async execute(integration, args) {
      const client = await getLinearClient(integration.id, integration.environmentId);
      return await client.addComment({
        issueId: String(args.issue_id ?? ''),
        body: String(args.body ?? ''),
      });
    },
  },
  {
    name: 'linear_update_issue_state',
    provider: 'linear',
    mutating: true,
    description:
      'Move a Linear issue to a different workflow state. WRITE — requires human approval. state_id is the workflow state id (look it up via Linear UI or future state-list tool).',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'string' },
        state_id: { type: 'string' },
      },
      required: ['issue_id', 'state_id'],
    },
    summarize(args) {
      return `Move Linear issue ${args.issue_id} to state ${args.state_id}`;
    },
    async execute(integration, args) {
      const client = await getLinearClient(integration.id, integration.environmentId);
      return await client.updateIssueState({
        issueId: String(args.issue_id ?? ''),
        stateId: String(args.state_id ?? ''),
      });
    },
  },

  // ── GitHub — WRITE Phase 6 ────────────────────────────────────────
  {
    name: 'github_close_issue',
    provider: 'github',
    mutating: true,
    description:
      'Close a GitHub issue or pull request. WRITE — requires human approval.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        issue_number: { type: 'number' },
      },
      required: ['owner', 'repo', 'issue_number'],
    },
    summarize(args) {
      return `Close ${args.owner}/${args.repo}#${args.issue_number}`;
    },
    async execute(integration, args) {
      const client = await getGitHubClient(integration.id, integration.environmentId);
      return await client.closeIssue(
        String(args.owner ?? ''),
        String(args.repo ?? ''),
        Number(args.issue_number ?? 0),
      );
    },
  },

  // ── Notion — WRITE Phase 6 ────────────────────────────────────────
  {
    name: 'notion_append_blocks',
    provider: 'notion',
    mutating: true,
    description:
      'Append rich content blocks to an existing Notion page. WRITE — requires human approval. Each block has a type (paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, to_do, quote, code) and a text payload.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              text: { type: 'string' },
            },
            required: ['type', 'text'],
          },
        },
      },
      required: ['page_id', 'blocks'],
    },
    summarize(args) {
      const blocks = Array.isArray(args.blocks) ? args.blocks : [];
      return `Append ${blocks.length} block(s) to Notion page ${args.page_id}`;
    },
    async execute(integration, args) {
      const client = await getNotionClient(integration.id, integration.environmentId);
      const blocks = Array.isArray(args.blocks)
        ? (args.blocks as { type: string; text: string }[]).map(b => ({
            type: String(b.type ?? 'paragraph'),
            text: String(b.text ?? ''),
          }))
        : [];
      return await client.appendBlocks({
        pageId: String(args.page_id ?? ''),
        blocks,
      });
    },
  },

  // ── HubSpot — WRITE Phase 6 ───────────────────────────────────────
  {
    name: 'hubspot_create_contact',
    provider: 'hubspot',
    mutating: true,
    description:
      'Create a new HubSpot contact. WRITE — requires human approval. Email is required; first/last name and lifecycle stage are optional.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        lifecycle_stage: { type: 'string' },
      },
      required: ['email'],
    },
    summarize(args) {
      const name = [args.first_name, args.last_name].filter(Boolean).join(' ');
      return `Create HubSpot contact ${name ? `${name} <${args.email}>` : String(args.email)}`;
    },
    async execute(integration, args) {
      const client = await getHubSpotClient(integration.id, integration.environmentId);
      return await client.createContact({
        email: String(args.email ?? ''),
        firstName: typeof args.first_name === 'string' ? args.first_name : undefined,
        lastName: typeof args.last_name === 'string' ? args.last_name : undefined,
        lifecycleStage:
          typeof args.lifecycle_stage === 'string' ? args.lifecycle_stage : undefined,
      });
    },
  },

  // ── Salesforce — WRITE Phase 6 ────────────────────────────────────
  {
    name: 'salesforce_create_lead',
    provider: 'salesforce',
    mutating: true,
    description:
      'Create a new Salesforce Lead. WRITE — requires human approval. last_name and company are required per the SF API.',
    inputSchema: {
      type: 'object',
      properties: {
        last_name: { type: 'string' },
        company: { type: 'string' },
        first_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['last_name', 'company'],
    },
    summarize(args) {
      const name = [args.first_name, args.last_name].filter(Boolean).join(' ');
      return `Create Salesforce Lead: ${name} @ ${args.company}`;
    },
    async execute(integration, args) {
      const client = await getSalesforceClient(integration.id, integration.environmentId);
      return await client.createLead({
        lastName: String(args.last_name ?? ''),
        company: String(args.company ?? ''),
        firstName: typeof args.first_name === 'string' ? args.first_name : undefined,
        email: typeof args.email === 'string' ? args.email : undefined,
        phone: typeof args.phone === 'string' ? args.phone : undefined,
        title: typeof args.title === 'string' ? args.title : undefined,
      });
    },
  },

  // ── Shopify ───────────────────────────────────────────────────────
  {
    name: 'shopify_recent_orders',
    provider: 'shopify',
    description: 'Fetch recent Shopify orders with totals, financial/fulfillment status.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    async execute(integration, args) {
      const client = await getShopifyClient(integration.id, integration.environmentId);
      return await client.getRecentOrders(typeof args.limit === 'number' ? args.limit : 25);
    },
  },
  {
    name: 'shopify_order_totals_30d',
    provider: 'shopify',
    description: 'Fetch Shopify store totals for the last 30 days: order count, paid orders, revenue, currency.',
    inputSchema: { type: 'object', properties: {} },
    async execute(integration) {
      const client = await getShopifyClient(integration.id, integration.environmentId);
      return await client.getOrderTotals30d();
    },
  },

  // ── Figma ──────────────────────────────────────────────────────────
  {
    name: 'figma_get_file',
    provider: 'figma',
    description:
      'Get a Figma file\'s structure: name, pages, published components, and styles. Use this to understand the layout and design system of a Figma file. Requires a file key (the string after /file/ in a Figma URL, e.g. "abc123XYZ").',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key from the URL (e.g. "abc123XYZ" from figma.com/file/abc123XYZ/...)' },
      },
      required: ['file_key'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      return await client.getFile(String(args.file_key));
    },
  },
  {
    name: 'figma_get_text_content',
    provider: 'figma',
    description:
      'Extract all text content from a Figma file. Returns every TEXT node with its content, name, and styling. Use this to audit copy, extract content for a CMS, or review microcopy across a design.',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key' },
      },
      required: ['file_key'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      return await client.getTextContent(String(args.file_key));
    },
  },
  {
    name: 'figma_get_components',
    provider: 'figma',
    description:
      'List all published components in a Figma file — buttons, cards, inputs, icons, etc. Returns component names, descriptions, and containing frames. Use this to understand the design system.',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key' },
      },
      required: ['file_key'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      return await client.getComponents(String(args.file_key));
    },
  },
  {
    name: 'figma_get_nodes',
    provider: 'figma',
    description:
      'Get detailed information about specific nodes (frames, components, groups) in a Figma file. Use node IDs from figma_get_file to drill into specific sections of a design.',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key' },
        node_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of node IDs to fetch (e.g. ["1:2", "3:4"])',
        },
      },
      required: ['file_key', 'node_ids'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      const nodeIds = Array.isArray(args.node_ids) ? args.node_ids.map(String) : [String(args.node_ids)];
      return await client.getNodes(String(args.file_key), nodeIds);
    },
  },
  {
    name: 'figma_get_comments',
    provider: 'figma',
    description:
      'Get all comments on a Figma file, including author, message, and resolution status. Use this to review design feedback or check for unresolved review threads.',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key' },
      },
      required: ['file_key'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      return await client.getComments(String(args.file_key));
    },
  },
  {
    name: 'figma_get_images',
    provider: 'figma',
    description:
      'Render specific nodes from a Figma file as images (PNG or SVG). Returns URLs to the rendered images. Use this to export specific frames, components, or sections.',
    inputSchema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma file key' },
        node_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of node IDs to render',
        },
        format: { type: 'string', enum: ['png', 'svg'], description: 'Image format (default: png)' },
      },
      required: ['file_key', 'node_ids'],
    },
    async execute(integration, args) {
      const client = await getFigmaClient(integration.id, integration.environmentId);
      const nodeIds = Array.isArray(args.node_ids) ? args.node_ids.map(String) : [String(args.node_ids)];
      const format = (args.format === 'svg' ? 'svg' : 'png') as 'png' | 'svg';
      return await client.getImages(String(args.file_key), nodeIds, format);
    },
  },
];

export function selectAvailableTools(integrations: Integration[]) {
  // Group all ACTIVE integrations by provider so multi-account
  // workspaces show every candidate to the model.
  const candidatesByProvider = new Map<string, Integration[]>();
  for (const int of integrations) {
    if (int.status !== 'ACTIVE' || int.deletedAt) continue;
    const list = candidatesByProvider.get(int.provider) ?? [];
    list.push(int);
    candidatesByProvider.set(int.provider, list);
  }

  const available: {
    tool: AgentTool;
    integration: Integration; // legacy "primary" — first candidate
    candidates: Integration[];
    anthropic: { name: string; description: string; input_schema: ToolInputSchema };
  }[] = [];
  for (const tool of TOOLS) {
    const candidates = candidatesByProvider.get(tool.provider);
    if (!candidates || candidates.length === 0) continue;

    let input_schema: ToolInputSchema = tool.inputSchema;
    let description = tool.description;

    if (candidates.length > 1) {
      // Inject the disambiguator. Use a fresh object so we don't
      // mutate the registry's shared schema reference.
      const enumIds = candidates.map((c) => c.id);
      const labels = candidates
        .map((c) => `${c.id} (${c.accountLabel ?? c.displayName})`)
        .join(', ');
      input_schema = {
        type: 'object',
        properties: {
          ...tool.inputSchema.properties,
          integration_id: {
            type: 'string',
            enum: enumIds,
            description: `Pick one connected ${tool.provider} account: ${labels}`,
          },
        },
        required: ['integration_id', ...(tool.inputSchema.required ?? [])],
      };
      description = `${tool.description} Multiple ${tool.provider} accounts are connected — set integration_id to one of: ${labels}.`;
    }

    available.push({
      tool,
      integration: candidates[0],
      candidates,
      anthropic: {
        name: tool.name,
        description,
        input_schema,
      },
    });
  }

  const byName = new Map(available.map((a) => [a.tool.name, a] as const));
  return { available, byName };
}
