/**
 * Integration registry — the canonical list of every third-party
 * provider Grid can connect to, plus the metadata the UI and router
 * need to drive the connect flow.
 *
 * The registry is the single source of truth. `provider` strings
 * stored on the Integration model MUST match an id in PROVIDERS.
 * Adding a new integration means:
 *   1. Add an entry here (metadata only).
 *   2. Implement its auth flow under lib/integrations/oauth/<id>.ts
 *      or lib/integrations/apikey/<id>.ts.
 *   3. Implement its read client under lib/integrations/clients/<id>.ts.
 *   4. Wire any envEnv-var requirements into docs/INTEGRATIONS_SETUP.md.
 *
 * We intentionally keep THIS file dependency-free (no Node APIs, no
 * Prisma, no SDKs) so the React integrations page can import it for
 * the provider grid without pulling server-only modules into the
 * client bundle.
 */

export type IntegrationCategory =
  | 'advertising'
  | 'analytics'
  | 'calendar'
  | 'crm'
  | 'commerce'
  | 'comms'
  | 'devtools'
  | 'infra'
  | 'productivity';

export type IntegrationAuthType = 'oauth' | 'api_key' | 'service_account';

export type IntegrationProviderDef = {
  id: string; // canonical slug stored on Integration.provider
  name: string;
  tagline: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;

  // Display-only. Not used for auth — just for the provider grid.
  accentColor: string;

  // OAuth providers declare their scopes; api_key providers leave []
  scopes: string[];

  // For api_key providers: the shape of the form the UI renders.
  // Each field becomes a named input on the connect modal and ends up
  // in the credential blob as { [field]: value } JSON (then AES-GCM
  // encrypted). OAuth providers leave this empty.
  apiKeyFields?: { name: string; label: string; type: 'text' | 'password'; placeholder?: string; helper?: string }[];

  // Env vars the operator must set before this provider will work.
  // Surfaced in /api/integrations/providers so the UI can grey out
  // providers that aren't wired up yet and explain why.
  requiredEnvVars: string[];

  // Lit when at least one implemented path (auth flow + client) is
  // present. Providers that only exist in the registry but haven't
  // been coded yet set this to false → UI shows "Coming soon".
  implemented: boolean;

  // Stable single-character / short glyph for the grid card. We draw
  // our own icons rather than hotlinking vendor logos to avoid brand
  // usage issues. Keeps the interface visually cohesive with the rest
  // of the app's minimal chrome aesthetic.
  glyph: string;
};

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  advertising: 'Advertising',
  analytics: 'Analytics',
  calendar: 'Calendar',
  crm: 'CRM',
  commerce: 'Commerce',
  comms: 'Communication',
  devtools: 'Developer',
  infra: 'Infrastructure',
  productivity: 'Productivity',
};

export const CATEGORY_ORDER: IntegrationCategory[] = [
  'calendar',
  'advertising',
  'analytics',
  'crm',
  'commerce',
  'comms',
  'devtools',
  'infra',
  'productivity',
];

/**
 * The canonical provider list. When you add one here, the UI picks
 * it up automatically on next reload — no hand-wiring.
 */
export const PROVIDERS: IntegrationProviderDef[] = [
  // ── Advertising ───────────────────────────────────────────────
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    tagline: 'Facebook & Instagram ad performance',
    category: 'advertising',
    authType: 'oauth',
    accentColor: '#1877f2',
    scopes: ['ads_read', 'ads_management', 'business_management'],
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    implemented: true,
    glyph: '◐',
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    tagline: 'Search, Display, YouTube campaigns',
    category: 'advertising',
    authType: 'oauth',
    accentColor: '#4285f4',
    scopes: ['https://www.googleapis.com/auth/adwords'],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN'],
    implemented: true,
    glyph: '◒',
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    tagline: 'GA4 property metrics',
    category: 'analytics',
    authType: 'oauth',
    accentColor: '#f9ab00',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    implemented: true,
    glyph: '◓',
  },
  {
    id: 'google_search_console',
    name: 'Search Console',
    tagline: 'Organic impressions & clicks',
    category: 'analytics',
    authType: 'oauth',
    accentColor: '#4285f4',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    implemented: true,
    glyph: '◔',
  },

  // ── Calendar ─────────────────────────────────────────────────
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    tagline: 'Events, meetings, availability',
    category: 'calendar',
    authType: 'oauth',
    accentColor: '#4285f4',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    implemented: true,
    glyph: '◰',
  },
  {
    id: 'microsoft_outlook',
    name: 'Microsoft Outlook',
    tagline: 'Outlook Calendar, Teams meetings',
    category: 'calendar',
    authType: 'oauth',
    accentColor: '#0078d4',
    scopes: [
      'Calendars.Read',
      'User.Read',
    ],
    requiredEnvVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    implemented: true,
    glyph: '◲',
  },
  {
    id: 'apple_calendar',
    name: 'Apple Calendar',
    tagline: 'iCloud Calendar via CalDAV',
    category: 'calendar',
    authType: 'api_key',
    accentColor: '#333333',
    scopes: [],
    apiKeyFields: [
      { name: 'appleId', label: 'Apple ID', type: 'text', placeholder: 'you@icloud.com' },
      { name: 'appPassword', label: 'App-specific password', type: 'password', placeholder: 'xxxx-xxxx-xxxx-xxxx', helper: 'Generate at appleid.apple.com > Security > App-Specific Passwords.' },
    ],
    requiredEnvVars: [],
    implemented: true,
    glyph: '◳',
  },
  {
    id: 'caldav',
    name: 'CalDAV',
    tagline: 'Any CalDAV-compatible calendar server',
    category: 'calendar',
    authType: 'api_key',
    accentColor: '#6b7280',
    scopes: [],
    apiKeyFields: [
      { name: 'serverUrl', label: 'CalDAV server URL', type: 'text', placeholder: 'https://caldav.example.com/dav/' },
      { name: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
    requiredEnvVars: [],
    implemented: true,
    glyph: '◱',
  },

  // ── CRM ───────────────────────────────────────────────────────
  {
    id: 'salesforce',
    name: 'Salesforce',
    tagline: 'Opportunities, pipeline, activities',
    category: 'crm',
    authType: 'oauth',
    accentColor: '#00a1e0',
    scopes: ['api', 'refresh_token'],
    requiredEnvVars: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'],
    implemented: true,
    glyph: '◕',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    tagline: 'Contacts, deals, marketing',
    category: 'crm',
    authType: 'oauth',
    accentColor: '#ff7a59',
    scopes: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
    requiredEnvVars: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'],
    implemented: true,
    glyph: '◖',
  },

  // ── Commerce ──────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Revenue, subscriptions, churn',
    category: 'commerce',
    authType: 'api_key',
    accentColor: '#635bff',
    scopes: [],
    apiKeyFields: [
      {
        name: 'secretKey',
        label: 'Secret key',
        type: 'password',
        placeholder: 'sk_live_…',
        helper: 'Dashboard → Developers → API keys. Restricted keys with read access are preferred.',
      },
    ],
    requiredEnvVars: [],
    implemented: true,
    glyph: '◗',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    tagline: 'Orders, inventory, customers',
    category: 'commerce',
    authType: 'api_key',
    accentColor: '#95bf47',
    scopes: [],
    apiKeyFields: [
      { name: 'shopDomain', label: 'Shop domain', type: 'text', placeholder: 'acme.myshopify.com' },
      { name: 'accessToken', label: 'Admin API access token', type: 'password', placeholder: 'shpat_…' },
    ],
    requiredEnvVars: [],
    implemented: true,
    glyph: '●',
  },

  // ── Communication ────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Channels, messages, alerts',
    category: 'comms',
    authType: 'oauth',
    accentColor: '#4a154b',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    requiredEnvVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
    implemented: true,
    glyph: '◉',
  },

  // ── Developer tools ──────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    tagline: 'Repositories, issues, PRs',
    category: 'devtools',
    authType: 'oauth',
    accentColor: '#24292f',
    scopes: ['repo', 'read:org'],
    requiredEnvVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    implemented: true,
    glyph: '◎',
  },
  {
    id: 'linear',
    name: 'Linear',
    tagline: 'Issues, cycles, projects',
    category: 'devtools',
    authType: 'oauth',
    accentColor: '#5e6ad2',
    scopes: ['read', 'write'],
    requiredEnvVars: ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET'],
    implemented: true,
    glyph: '◍',
  },

  // ── Infrastructure ───────────────────────────────────────────
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    tagline: 'Zones, DNS, analytics',
    category: 'infra',
    authType: 'api_key',
    accentColor: '#f38020',
    scopes: [],
    apiKeyFields: [
      {
        name: 'apiToken',
        label: 'API token',
        type: 'password',
        placeholder: 'Bearer token from Cloudflare dashboard',
        helper: 'My Profile → API Tokens → Create token. Grant Zone:Read + Analytics:Read at minimum.',
      },
    ],
    requiredEnvVars: [],
    implemented: true,
    glyph: '◈',
  },

  // ── Productivity ─────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    tagline: 'Pages, databases, docs',
    category: 'productivity',
    authType: 'oauth',
    accentColor: '#000000',
    scopes: [],
    requiredEnvVars: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'],
    implemented: true,
    glyph: '◌',
  },
  {
    id: 'figma',
    name: 'Figma',
    tagline: 'Designs, components, styles, content',
    category: 'productivity',
    authType: 'oauth',
    accentColor: '#1abcfe',
    scopes: ['files:read'],
    requiredEnvVars: ['FIGMA_CLIENT_ID', 'FIGMA_CLIENT_SECRET'],
    implemented: true,
    glyph: '◆',
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    tagline: 'Gmail, Calendar, Drive, Docs',
    category: 'productivity',
    authType: 'oauth',
    accentColor: '#4285f4',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    implemented: true,
    glyph: '◯',
  },
];

/** Look up a provider by its canonical slug. */
export function findProvider(id: string): IntegrationProviderDef | null {
  return PROVIDERS.find(p => p.id === id) ?? null;
}

/** Filter to providers whose declared env vars are actually set. */
export function hasRequiredEnv(def: IntegrationProviderDef): boolean {
  return def.requiredEnvVars.every(name => Boolean(process.env[name]));
}

/**
 * Summary shape for the /api/integrations/providers endpoint and the
 * provider grid. Keeps the client bundle small: no secrets, no SDKs.
 */
export type ProviderSummary = {
  id: string;
  name: string;
  tagline: string;
  category: IntegrationCategory;
  categoryLabel: string;
  authType: IntegrationAuthType;
  accentColor: string;
  glyph: string;
  implemented: boolean;
  envReady: boolean;
  missingEnvVars: string[];
  apiKeyFields?: IntegrationProviderDef['apiKeyFields'];
};

export function summarizeProvider(def: IntegrationProviderDef): ProviderSummary {
  const missing = def.requiredEnvVars.filter(name => !process.env[name]);
  return {
    id: def.id,
    name: def.name,
    tagline: def.tagline,
    category: def.category,
    categoryLabel: CATEGORY_LABELS[def.category],
    authType: def.authType,
    accentColor: def.accentColor,
    glyph: def.glyph,
    implemented: def.implemented,
    envReady: missing.length === 0,
    missingEnvVars: missing,
    apiKeyFields: def.apiKeyFields,
  };
}
