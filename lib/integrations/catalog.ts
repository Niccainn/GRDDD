/**
 * Integration catalog — generated from lib/integrations/clients/*.ts.
 *
 * Every `getXxxClient` factory in the clients directory surfaces
 * here as { getter, methods }, and each method is tagged write/read
 * via name heuristics (create/post/add/send/update/close/delete/etc
 * are writes). The dispatcher uses this to invoke any method by
 * (provider, method, args) without a per-method registry entry.
 *
 * Adding a new provider adapter = (1) add the client under
 * lib/integrations/clients/, (2) re-run scripts/gen-integration-catalog
 * or add an entry here by hand. Nothing else changes.
 */

import { getActiveCampaignClient } from '@/lib/integrations/clients/activecamp';
import { getAdobeCcClient } from '@/lib/integrations/clients/adobe-cc';
import { getAnthropicClient } from '@/lib/integrations/clients/anthropic';
import { getAirtableClient } from '@/lib/integrations/clients/airtable';
import { getAmplitudeClient } from '@/lib/integrations/clients/amplitude';
import { getAsanaClient } from '@/lib/integrations/clients/asana';
import { getBambooHRClient } from '@/lib/integrations/clients/bamboohr';
import { getBasecampClient } from '@/lib/integrations/clients/basecamp';
import { getBeehiivClient } from '@/lib/integrations/clients/beehiiv';
import { getBitbucketClient } from '@/lib/integrations/clients/bitbucket';
import { getBoxClient } from '@/lib/integrations/clients/box';
import { getBufferClient } from '@/lib/integrations/clients/buffer';
import { getCalendlyClient } from '@/lib/integrations/clients/calendly';
import { getCanvaClient } from '@/lib/integrations/clients/canva';
import { getClickUpClient } from '@/lib/integrations/clients/clickup';
import { getCloudflareClient } from '@/lib/integrations/clients/cloudflare';
import { getCodaClient } from '@/lib/integrations/clients/coda';
import { getConfluenceClient } from '@/lib/integrations/clients/confluence';
import { getConvertKitClient } from '@/lib/integrations/clients/convertkit';
import { getCrispClient } from '@/lib/integrations/clients/crisp';
import { getDatadogClient } from '@/lib/integrations/clients/datadog';
import { getDeelClient } from '@/lib/integrations/clients/deel';
import { getDiscordClient } from '@/lib/integrations/clients/discord';
import { getDropboxClient } from '@/lib/integrations/clients/dropbox';
import { getFigmaClient } from '@/lib/integrations/clients/figma';
import { getFirebaseClient } from '@/lib/integrations/clients/firebase';
import { getFlyIoClient } from '@/lib/integrations/clients/fly-io';
import { getFreshBooksClient } from '@/lib/integrations/clients/freshbooks';
import { getFreshdeskClient } from '@/lib/integrations/clients/freshdesk';
import { getGitHubClient } from '@/lib/integrations/clients/github';
import { getGitLabClient } from '@/lib/integrations/clients/gitlab';
import { getGoogleAdsClient } from '@/lib/integrations/clients/google-ads';
import { getGoogleAnalyticsClient } from '@/lib/integrations/clients/google-analytics';
import { getGoogleCalendarClient } from '@/lib/integrations/clients/google-calendar';
import { getGoogleDriveClient } from '@/lib/integrations/clients/google-drive';
import { getGoogleSearchConsoleClient } from '@/lib/integrations/clients/google-search-console';
import { getGoogleWorkspaceClient } from '@/lib/integrations/clients/google-workspace';
import { getGumroadClient } from '@/lib/integrations/clients/gumroad';
import { getGustoClient } from '@/lib/integrations/clients/gusto';
import { getHelpScoutClient } from '@/lib/integrations/clients/helpscout';
import { getHubSpotClient } from '@/lib/integrations/clients/hubspot';
import { getInstagramClient } from '@/lib/integrations/clients/instagram';
import { getIntercomClient } from '@/lib/integrations/clients/intercom';
import { getJiraClient } from '@/lib/integrations/clients/jira';
import { getLemonSqueezyClient } from '@/lib/integrations/clients/lemon-squeezy';
import { getLinearClient } from '@/lib/integrations/clients/linear';
import { getLinkedInAdsClient } from '@/lib/integrations/clients/linkedin-ads';
import { getLinkedInClient } from '@/lib/integrations/clients/linkedin';
import { getLoomClient } from '@/lib/integrations/clients/loom';
import { getMailchimpClient } from '@/lib/integrations/clients/mailchimp';
import { getMetaAdsClient } from '@/lib/integrations/clients/meta-ads';
import { getMicrosoftOutlookClient } from '@/lib/integrations/clients/microsoft-outlook';
import { getMicrosoftTeamsClient } from '@/lib/integrations/clients/microsoft-teams';
import { getMiroClient } from '@/lib/integrations/clients/miro';
import { getMixpanelClient } from '@/lib/integrations/clients/mixpanel';
import { getMondayClient } from '@/lib/integrations/clients/monday';
import { getMongoDBAtlasClient } from '@/lib/integrations/clients/mongodb-atlas';
import { getMuxClient } from '@/lib/integrations/clients/mux';
import { getOpenAIClient } from '@/lib/integrations/clients/openai';
import { getResendClient } from '@/lib/integrations/clients/resend';
import { getElevenLabsClient } from '@/lib/integrations/clients/elevenlabs';
import { getNetlifyClient } from '@/lib/integrations/clients/netlify';
import { getNotionClient } from '@/lib/integrations/clients/notion';
import { getOneDriveClient } from '@/lib/integrations/clients/onedrive';
import { getPagerDutyClient } from '@/lib/integrations/clients/pagerduty';
import { getPayPalClient } from '@/lib/integrations/clients/paypal';
import { getPlausibleClient } from '@/lib/integrations/clients/plausible';
import { getPostHogClient } from '@/lib/integrations/clients/posthog';
import { getQuickBooksClient } from '@/lib/integrations/clients/quickbooks';
import { getSalesforceClient } from '@/lib/integrations/clients/salesforce';
import { getSegmentClient } from '@/lib/integrations/clients/segment';
import { getSendGridClient } from '@/lib/integrations/clients/sendgrid';
import { getShopifyClient } from '@/lib/integrations/clients/shopify';
import { getSlackClient } from '@/lib/integrations/clients/slack';
import { getSquareClient } from '@/lib/integrations/clients/square';
import { getStripeClient } from '@/lib/integrations/clients/stripe';
import { getSupabaseClient } from '@/lib/integrations/clients/supabase';
import { getSurveyMonkeyClient } from '@/lib/integrations/clients/surveymonkey';
import { getTikTokAdsClient } from '@/lib/integrations/clients/tiktok-ads';
import { getTikTokClient } from '@/lib/integrations/clients/tiktok';
import { getTodoistClient } from '@/lib/integrations/clients/todoist';
import { getTrelloClient } from '@/lib/integrations/clients/trello';
import { getTwilioClient } from '@/lib/integrations/clients/twilio';
import { getTwitterClient } from '@/lib/integrations/clients/twitter';
import { getTypeformClient } from '@/lib/integrations/clients/typeform';
import { getVercelClient } from '@/lib/integrations/clients/vercel';
import { getVimeoClient } from '@/lib/integrations/clients/vimeo';
import { getWaveClient } from '@/lib/integrations/clients/wave';
import { getWooCommerceClient } from '@/lib/integrations/clients/woocommerce';
import { getWrikeClient } from '@/lib/integrations/clients/wrike';
import { getXeroClient } from '@/lib/integrations/clients/xero';
import { getYouTubeClient } from '@/lib/integrations/clients/youtube';
import { getZendeskClient } from '@/lib/integrations/clients/zendesk';
import { getZoomClient } from '@/lib/integrations/clients/zoom';

export type AdapterGetter = (integrationId: string, environmentId: string) => Promise<Record<string, unknown>>;

export type CatalogMethod = { name: string; write: boolean };
export type CatalogEntry = { label: string; getter: AdapterGetter; methods: CatalogMethod[] };

/**
 * Registry IDs (lib/integrations/registry.ts) use snake_case as the
 * canonical Integration.provider value stored in the DB. Catalog
 * entries below use kebab-case to match the client filenames under
 * lib/integrations/clients/.
 *
 * Without an alias map, a user connecting "Google Drive" would land
 * an Integration row with provider='google_drive', then Nova's
 * dispatch (lib/nova/tools/dispatch.ts) would look up the catalog
 * by 'google_drive' and find nothing — every write tool call would
 * silently route to simulation.
 *
 * Resolve always goes registry-ID → catalog-key, never the reverse.
 * If new providers are added, they should match registry IDs in the
 * catalog directly to avoid more aliases. This map is a compatibility
 * shim, not a long-term pattern.
 */
const REGISTRY_TO_CATALOG_ALIASES: Record<string, string> = {
  'activecampaign':         'activecamp',
  'fly':                    'fly-io',
  'google_ads':             'google-ads',
  'google_analytics':       'google-analytics',
  'google_calendar':        'google-calendar',
  'google_drive':           'google-drive',
  'google_search_console':  'google-search-console',
  'google_workspace':       'google-workspace',
  'lemonsqueezy':           'lemon-squeezy',
  'linkedin_ads':           'linkedin-ads',
  'meta_ads':               'meta-ads',
  'microsoft_outlook':      'microsoft-outlook',
  'microsoft_teams':        'microsoft-teams',
  'mongodb':                'mongodb-atlas',
  'tiktok_ads':             'tiktok-ads',
  // Adobe registry id is `adobe_creative_cloud` (matching Adobe's
  // own naming) but the client filename is the shorter `adobe-cc`.
  'adobe_creative_cloud':   'adobe-cc',
};

/**
 * Look up a catalog entry by either registry ID (snake_case) or
 * catalog key (kebab-case). Use this everywhere instead of indexing
 * INTEGRATION_CATALOG directly so registry-ID consumers don't 404.
 */
export function getCatalogEntry(provider: string): CatalogEntry | undefined {
  const canonical = REGISTRY_TO_CATALOG_ALIASES[provider] ?? provider;
  return INTEGRATION_CATALOG[canonical];
}

export const INTEGRATION_CATALOG: Record<string, CatalogEntry> = {
  'adobe-cc': {
    label: 'Adobe Creative Cloud',
    getter: getAdobeCcClient,
    methods: [
      { name: 'listLibraries', write: false },
      { name: 'listLibraryElements', write: false },
      { name: 'searchStock', write: false },
    ],
  },
  'anthropic': {
    label: 'Anthropic',
    getter: getAnthropicClient,
    methods: [
      { name: 'listModels', write: false },
      { name: 'completion', write: true },
    ],
  },
  'openai': {
    label: 'OpenAI',
    getter: getOpenAIClient,
    methods: [
      { name: 'listModels', write: false },
      { name: 'chatCompletion', write: true },
    ],
  },
  'elevenlabs': {
    label: 'ElevenLabs',
    getter: getElevenLabsClient,
    methods: [
      { name: 'listVoices', write: false },
      { name: 'getAccountInfo', write: false },
      { name: 'textToSpeech', write: true },
    ],
  },
  'resend': {
    label: 'Resend',
    getter: getResendClient,
    methods: [
      { name: 'listDomains', write: false },
      { name: 'sendEmail', write: true },
    ],
  },
  'activecamp': {
    label: 'ActiveCampaign',
    getter: getActiveCampaignClient,
    methods: [
    { name: 'listAutomations', write: false },
    { name: 'listContacts', write: false },
    { name: 'listDeals', write: false },
    ],
  },
  'airtable': {
    label: 'Airtable',
    getter: getAirtableClient,
    methods: [
    { name: 'getBaseSchema', write: false },
    { name: 'listBases', write: false },
    { name: 'listRecords', write: false },
    ],
  },
  'amplitude': {
    label: 'Amplitude',
    getter: getAmplitudeClient,
    methods: [
    { name: 'getActiveUsers', write: false },
    { name: 'getEventCounts', write: false },
    ],
  },
  'asana': {
    label: 'Asana',
    getter: getAsanaClient,
    methods: [
    { name: 'getMyTasks', write: false },
    { name: 'getTaskDetails', write: false },
    { name: 'listProjects', write: false },
    ],
  },
  'bamboohr': {
    label: 'BambooHR',
    getter: getBambooHRClient,
    methods: [
    { name: 'getTimeOff', write: false },
    { name: 'listEmployees', write: false },
    ],
  },
  'basecamp': {
    label: 'Basecamp',
    getter: getBasecampClient,
    methods: [
    { name: 'getProject', write: false },
    { name: 'listProjects', write: false },
    ],
  },
  'beehiiv': {
    label: 'Beehiiv',
    getter: getBeehiivClient,
    methods: [
    { name: 'getStats', write: false },
    { name: 'getSubscribers', write: false },
    { name: 'listPublications', write: false },
    ],
  },
  'bitbucket': {
    label: 'Bitbucket',
    getter: getBitbucketClient,
    methods: [
    { name: 'listPullRequests', write: false },
    { name: 'listRepositories', write: false },
    ],
  },
  'box': {
    label: 'Box',
    getter: getBoxClient,
    methods: [
    { name: 'listItems', write: false },
    { name: 'searchFiles', write: false },
    ],
  },
  'buffer': {
    label: 'Buffer',
    getter: getBufferClient,
    methods: [
    { name: 'getUpdates', write: false },
    { name: 'listProfiles', write: false },
    ],
  },
  'calendly': {
    label: 'Calendly',
    getter: getCalendlyClient,
    methods: [
    { name: 'getUser', write: false },
    { name: 'listEvents', write: false },
    ],
  },
  'canva': {
    label: 'Canva',
    getter: getCanvaClient,
    methods: [
    { name: 'createDesign', write: true },
    { name: 'getDesign', write: false },
    { name: 'listDesigns', write: false },
    ],
  },
  'clickup': {
    label: 'ClickUp',
    getter: getClickUpClient,
    methods: [
    { name: 'listSpaces', write: false },
    { name: 'listTasks', write: false },
    ],
  },
  'cloudflare': {
    label: 'Cloudflare',
    getter: getCloudflareClient,
    methods: [
    { name: 'listDnsRecords', write: false },
    { name: 'listZones', write: false },
    { name: 'zoneAnalytics24h', write: false },
    ],
  },
  'coda': {
    label: 'Coda',
    getter: getCodaClient,
    methods: [
    { name: 'getDoc', write: false },
    { name: 'listDocs', write: false },
    ],
  },
  'confluence': {
    label: 'Confluence',
    getter: getConfluenceClient,
    methods: [
    { name: 'getRecentPages', write: false },
    { name: 'searchContent', write: false },
    ],
  },
  'convertkit': {
    label: 'ConvertKit',
    getter: getConvertKitClient,
    methods: [
    { name: 'getSubscribers', write: false },
    { name: 'listForms', write: false },
    { name: 'listSequences', write: false },
    ],
  },
  'crisp': {
    label: 'Crisp',
    getter: getCrispClient,
    methods: [
    { name: 'listConversations', write: false },
    ],
  },
  'datadog': {
    label: 'Datadog',
    getter: getDatadogClient,
    methods: [
    { name: 'getMetricQuery', write: false },
    { name: 'listMonitors', write: false },
    ],
  },
  'deel': {
    label: 'Deel',
    getter: getDeelClient,
    methods: [
    { name: 'listContracts', write: false },
    { name: 'listInvoices', write: false },
    ],
  },
  'discord': {
    label: 'Discord',
    getter: getDiscordClient,
    methods: [
    { name: 'getRecentMessages', write: false },
    { name: 'listChannels', write: false },
    { name: 'listGuilds', write: false },
    ],
  },
  'dropbox': {
    label: 'Dropbox',
    getter: getDropboxClient,
    methods: [
    { name: 'listFolder', write: false },
    { name: 'searchFiles', write: false },
    ],
  },
  'figma': {
    label: 'Figma',
    getter: getFigmaClient,
    methods: [
    { name: 'getComments', write: false },
    { name: 'getComponents', write: false },
    { name: 'getFile', write: false },
    { name: 'getImages', write: false },
    { name: 'getNodes', write: false },
    { name: 'getTextContent', write: false },
    { name: 'listFiles', write: false },
    ],
  },
  'firebase': {
    label: 'Firebase',
    getter: getFirebaseClient,
    methods: [
    { name: 'listCollections', write: false },
    { name: 'listDocuments', write: false },
    ],
  },
  'fly-io': {
    label: 'Fly.io',
    getter: getFlyIoClient,
    methods: [
    { name: 'listApps', write: false },
    { name: 'listMachines', write: false },
    ],
  },
  'freshbooks': {
    label: 'FreshBooks',
    getter: getFreshBooksClient,
    methods: [
    { name: 'listExpenses', write: false },
    { name: 'listInvoices', write: false },
    ],
  },
  'freshdesk': {
    label: 'Freshdesk',
    getter: getFreshdeskClient,
    methods: [
    { name: 'getTicketStats', write: false },
    { name: 'listTickets', write: false },
    ],
  },
  'github': {
    label: 'Github',
    getter: getGitHubClient,
    methods: [
    { name: 'closeIssue', write: true },
    { name: 'createIssueComment', write: true },
    { name: 'listOpenIssues', write: false },
    { name: 'listRepos', write: false },
    ],
  },
  'gitlab': {
    label: 'GitLab',
    getter: getGitLabClient,
    methods: [
    { name: 'listIssues', write: false },
    { name: 'listMergeRequests', write: false },
    { name: 'listProjects', write: false },
    ],
  },
  'google-ads': {
    label: 'Google Ads',
    getter: getGoogleAdsClient,
    methods: [
    { name: 'getAccountTotals', write: false },
    { name: 'getCampaignBreakdown', write: false },
    ],
  },
  'google-analytics': {
    label: 'Google Analytics',
    getter: getGoogleAnalyticsClient,
    methods: [
    { name: 'getTopPages', write: false },
    { name: 'getTrafficTotals', write: false },
    ],
  },
  'google-calendar': {
    label: 'Google Calendar',
    getter: getGoogleCalendarClient,
    methods: [
    { name: 'createDraftEvent', write: true },
    { name: 'listEvents', write: false },
    ],
  },
  'google-drive': {
    label: 'Google Drive',
    getter: getGoogleDriveClient,
    methods: [
    { name: 'createTextFile', write: true },
    { name: 'listRecentFiles', write: false },
    { name: 'searchFiles', write: false },
    ],
  },
  'google-search-console': {
    label: 'Google Search Console',
    getter: getGoogleSearchConsoleClient,
    methods: [
    { name: 'getTopQueries', write: false },
    { name: 'getTotals', write: false },
    ],
  },
  'google-workspace': {
    label: 'Google Workspace',
    getter: getGoogleWorkspaceClient,
    methods: [
    { name: 'gmailCreateDraft', write: false },
    { name: 'gmailUnreadCount', write: false },
    { name: 'listRecentDriveFiles', write: false },
    { name: 'listRecentMessages', write: false },
    { name: 'listUpcomingEvents', write: false },
    ],
  },
  'gumroad': {
    label: 'Gumroad',
    getter: getGumroadClient,
    methods: [
    { name: 'getSales', write: false },
    { name: 'listProducts', write: false },
    ],
  },
  'gusto': {
    label: 'Gusto',
    getter: getGustoClient,
    methods: [
    { name: 'getPayrolls', write: false },
    { name: 'listEmployees', write: false },
    ],
  },
  'helpscout': {
    label: 'Help Scout',
    getter: getHelpScoutClient,
    methods: [
    { name: 'listConversations', write: false },
    { name: 'listMailboxes', write: false },
    ],
  },
  'hubspot': {
    label: 'HubSpot',
    getter: getHubSpotClient,
    methods: [
    { name: 'createContact', write: true },
    { name: 'getOpenDeals', write: false },
    { name: 'getRecentContacts', write: false },
    ],
  },
  'instagram': {
    label: 'Instagram',
    getter: getInstagramClient,
    methods: [
    { name: 'getInsights', write: false },
    { name: 'getProfile', write: false },
    { name: 'getRecentMedia', write: false },
    ],
  },
  'intercom': {
    label: 'Intercom',
    getter: getIntercomClient,
    methods: [
    { name: 'getAdmins', write: false },
    { name: 'getCounts', write: false },
    { name: 'listConversations', write: false },
    ],
  },
  'jira': {
    label: 'Jira',
    getter: getJiraClient,
    methods: [
    { name: 'getMyIssues', write: false },
    { name: 'getProject', write: false },
    { name: 'searchIssues', write: false },
    ],
  },
  'lemon-squeezy': {
    label: 'Lemon Squeezy',
    getter: getLemonSqueezyClient,
    methods: [
    { name: 'getSubscriptions', write: false },
    { name: 'listOrders', write: false },
    { name: 'listProducts', write: false },
    ],
  },
  'linear': {
    label: 'Linear',
    getter: getLinearClient,
    methods: [
    { name: 'addComment', write: true },
    { name: 'createIssue', write: true },
    { name: 'getMyOpenIssues', write: false },
    { name: 'getTeamIssueCounts', write: false },
    { name: 'updateIssueState', write: true },
    ],
  },
  'linkedin-ads': {
    label: 'LinkedIn Ads',
    getter: getLinkedInAdsClient,
    methods: [
    { name: 'getCampaignAnalytics', write: false },
    { name: 'listAdAccounts', write: false },
    ],
  },
  'linkedin': {
    label: 'Linkedin',
    getter: getLinkedInClient,
    methods: [
    { name: 'getFollowerCount', write: false },
    { name: 'getProfile', write: false },
    ],
  },
  'loom': {
    label: 'Loom',
    getter: getLoomClient,
    methods: [
    { name: 'getVideo', write: false },
    { name: 'listVideos', write: false },
    ],
  },
  'mailchimp': {
    label: 'Mailchimp',
    getter: getMailchimpClient,
    methods: [
    { name: 'getCampaignReport', write: false },
    { name: 'getListInfo', write: false },
    { name: 'getRecentCampaigns', write: false },
    ],
  },
  'meta-ads': {
    label: 'Meta Ads',
    getter: getMetaAdsClient,
    methods: [
    { name: 'createDraftCampaign', write: true },
    { name: 'getAccountSummary', write: false },
    { name: 'getAccountTotals', write: false },
    { name: 'getCampaignInsights', write: false },
    ],
  },
  'microsoft-outlook': {
    label: 'Microsoft Outlook',
    getter: getMicrosoftOutlookClient,
    methods: [
    { name: 'listEvents', write: false },
    ],
  },
  'microsoft-teams': {
    label: 'Microsoft Teams',
    getter: getMicrosoftTeamsClient,
    methods: [
    { name: 'getRecentMessages', write: false },
    { name: 'listChannels', write: false },
    ],
  },
  'miro': {
    label: 'Miro',
    getter: getMiroClient,
    methods: [
    { name: 'getBoardItems', write: false },
    { name: 'listBoards', write: false },
    ],
  },
  'mixpanel': {
    label: 'Mixpanel',
    getter: getMixpanelClient,
    methods: [
    { name: 'getEventCounts', write: false },
    { name: 'getTopEvents', write: false },
    ],
  },
  'monday': {
    label: 'Monday',
    getter: getMondayClient,
    methods: [
    { name: 'listBoards', write: false },
    { name: 'listItems', write: false },
    ],
  },
  'mongodb-atlas': {
    label: 'MongoDB Atlas',
    getter: getMongoDBAtlasClient,
    methods: [
    { name: 'getClusterStatus', write: false },
    { name: 'listClusters', write: false },
    ],
  },
  'mux': {
    label: 'Mux',
    getter: getMuxClient,
    methods: [
    { name: 'getAssetPlaybackIds', write: false },
    { name: 'listAssets', write: false },
    ],
  },
  'netlify': {
    label: 'Netlify',
    getter: getNetlifyClient,
    methods: [
    { name: 'listDeploys', write: false },
    { name: 'listSites', write: false },
    ],
  },
  'notion': {
    label: 'Notion',
    getter: getNotionClient,
    methods: [
    { name: 'appendBlocks', write: true },
    { name: 'createPage', write: true },
    { name: 'fetchPage', write: false },
    { name: 'listDatabases', write: false },
    { name: 'searchPages', write: false },
    ],
  },
  'onedrive': {
    label: 'Onedrive',
    getter: getOneDriveClient,
    methods: [
    { name: 'listRecentFiles', write: false },
    { name: 'searchFiles', write: false },
    ],
  },
  'pagerduty': {
    label: 'PagerDuty',
    getter: getPagerDutyClient,
    methods: [
    { name: 'listIncidents', write: false },
    { name: 'listServices', write: false },
    ],
  },
  'paypal': {
    label: 'PayPal',
    getter: getPayPalClient,
    methods: [
    { name: 'getBalance', write: false },
    { name: 'listTransactions', write: false },
    ],
  },
  'plausible': {
    label: 'Plausible',
    getter: getPlausibleClient,
    methods: [
    { name: 'getRealtimeVisitors', write: false },
    { name: 'getTimeseries', write: false },
    ],
  },
  'posthog': {
    label: 'PostHog',
    getter: getPostHogClient,
    methods: [
    { name: 'getEventDefinitions', write: false },
    { name: 'listInsights', write: false },
    ],
  },
  'quickbooks': {
    label: 'QuickBooks',
    getter: getQuickBooksClient,
    methods: [
    { name: 'getCompanyInfo', write: false },
    { name: 'getProfitAndLoss', write: false },
    { name: 'getRecentInvoices', write: false },
    ],
  },
  'salesforce': {
    label: 'Salesforce',
    getter: getSalesforceClient,
    methods: [
    { name: 'createLead', write: true },
    { name: 'getPipelineByStage', write: false },
    { name: 'getTopOpenOpportunities', write: false },
    ],
  },
  'segment': {
    label: 'Segment',
    getter: getSegmentClient,
    methods: [
    { name: 'getSourceEvents', write: false },
    { name: 'listSources', write: false },
    ],
  },
  'sendgrid': {
    label: 'SendGrid',
    getter: getSendGridClient,
    methods: [
    { name: 'getStats', write: false },
    { name: 'listContacts', write: false },
    ],
  },
  'shopify': {
    label: 'Shopify',
    getter: getShopifyClient,
    methods: [
    { name: 'getOrderTotals30d', write: false },
    { name: 'getRecentOrders', write: false },
    ],
  },
  'slack': {
    label: 'Slack',
    getter: getSlackClient,
    methods: [
    { name: 'addReaction', write: true },
    { name: 'getChannelHistory', write: false },
    { name: 'listChannels', write: false },
    { name: 'postMessage', write: true },
    { name: 'postThreadReply', write: true },
    ],
  },
  'square': {
    label: 'Square',
    getter: getSquareClient,
    methods: [
    { name: 'listLocations', write: false },
    { name: 'listPayments', write: false },
    ],
  },
  'stripe': {
    label: 'Stripe',
    getter: getStripeClient,
    methods: [
    { name: 'getActiveSubscriptions', write: false },
    { name: 'getBalance', write: false },
    { name: 'getRecentCharges', write: false },
    ],
  },
  'supabase': {
    label: 'Supabase',
    getter: getSupabaseClient,
    methods: [
    { name: 'listTables', write: false },
    { name: 'queryTable', write: false },
    ],
  },
  'surveymonkey': {
    label: 'SurveyMonkey',
    getter: getSurveyMonkeyClient,
    methods: [
    { name: 'getSurveyResponses', write: false },
    { name: 'listSurveys', write: false },
    ],
  },
  'tiktok-ads': {
    label: 'TikTok Ads',
    getter: getTikTokAdsClient,
    methods: [
    { name: 'getAdGroupInsights', write: false },
    { name: 'getCampaigns', write: false },
    ],
  },
  'tiktok': {
    label: 'Tiktok',
    getter: getTikTokClient,
    methods: [
    { name: 'getRecentVideos', write: false },
    { name: 'getUserInfo', write: false },
    ],
  },
  'todoist': {
    label: 'Todoist',
    getter: getTodoistClient,
    methods: [
    { name: 'listProjects', write: false },
    { name: 'listTasks', write: false },
    ],
  },
  'trello': {
    label: 'Trello',
    getter: getTrelloClient,
    methods: [
    { name: 'listBoards', write: false },
    { name: 'listCards', write: false },
    ],
  },
  'twilio': {
    label: 'Twilio',
    getter: getTwilioClient,
    methods: [
    { name: 'getAccountBalance', write: false },
    { name: 'listMessages', write: false },
    ],
  },
  'twitter': {
    label: 'Twitter',
    getter: getTwitterClient,
    methods: [
    { name: 'getFollowerCount', write: false },
    { name: 'getMe', write: false },
    { name: 'getRecentTweets', write: false },
    ],
  },
  'typeform': {
    label: 'Typeform',
    getter: getTypeformClient,
    methods: [
    { name: 'getFormResponses', write: false },
    { name: 'listForms', write: false },
    ],
  },
  'vercel': {
    label: 'Vercel',
    getter: getVercelClient,
    methods: [
    { name: 'getProject', write: false },
    { name: 'listDeployments', write: false },
    { name: 'listProjects', write: false },
    ],
  },
  'vimeo': {
    label: 'Vimeo',
    getter: getVimeoClient,
    methods: [
    { name: 'getVideoStats', write: false },
    { name: 'listVideos', write: false },
    ],
  },
  'wave': {
    label: 'Wave',
    getter: getWaveClient,
    methods: [
    { name: 'getInvoices', write: false },
    { name: 'listBusinesses', write: false },
    ],
  },
  'woocommerce': {
    label: 'WooCommerce',
    getter: getWooCommerceClient,
    methods: [
    { name: 'getOrderTotals', write: false },
    { name: 'getProducts', write: false },
    { name: 'getRecentOrders', write: false },
    ],
  },
  'wrike': {
    label: 'Wrike',
    getter: getWrikeClient,
    methods: [
    { name: 'listFolders', write: false },
    { name: 'listTasks', write: false },
    ],
  },
  'xero': {
    label: 'Xero',
    getter: getXeroClient,
    methods: [
    { name: 'getBankAccounts', write: false },
    { name: 'getInvoices', write: false },
    { name: 'getProfitAndLoss', write: false },
    ],
  },
  'youtube': {
    label: 'YouTube',
    getter: getYouTubeClient,
    methods: [
    { name: 'getChannelStats', write: false },
    { name: 'listRecentVideos', write: false },
    ],
  },
  'zendesk': {
    label: 'Zendesk',
    getter: getZendeskClient,
    methods: [
    { name: 'getTicketCounts', write: false },
    { name: 'listTickets', write: false },
    ],
  },
  'zoom': {
    label: 'Zoom',
    getter: getZoomClient,
    methods: [
    { name: 'getMeetingRecordings', write: false },
    { name: 'getUser', write: false },
    { name: 'listMeetings', write: false },
    ],
  },
};

export function catalogSummary(): Array<{ provider: string; label: string; methods: CatalogMethod[] }> {
  return Object.entries(INTEGRATION_CATALOG).map(([provider, entry]) => ({
    provider,
    label: entry.label,
    methods: entry.methods,
  }));
}
