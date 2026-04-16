/**
 * Generic OAuth provider factory.
 *
 * For providers that follow standard OAuth2 and don't need any custom
 * logic (special token exchange, PKCE, shop-specific URLs, etc.), this
 * factory creates an OAuthProvider object that works directly with the
 * base primitives (buildAuthorizeUrl, exchangeCodeForTokens, etc.).
 *
 * Usage:
 *   const MY_PROVIDER = genericOAuthProvider('my_provider', {
 *     authorizeUrl: 'https://...',
 *     tokenUrl: 'https://...',
 *     clientIdEnv: 'MY_CLIENT_ID',
 *     clientSecretEnv: 'MY_CLIENT_SECRET',
 *   });
 */

import type { OAuthProvider } from './base';

export function genericOAuthProvider(
  id: string,
  authorizeUrl: string,
  tokenUrl: string,
  clientIdEnv: string,
  clientSecretEnv: string,
  opts?: {
    scopeSeparator?: ' ' | ',';
    extraAuthorizeParams?: Record<string, string>;
  },
): OAuthProvider {
  return {
    id,
    authorizeUrl,
    tokenUrl,
    clientIdEnv,
    clientSecretEnv,
    scopeSeparator: opts?.scopeSeparator ?? ' ',
    extraAuthorizeParams: opts?.extraAuthorizeParams,
  };
}

// ─── Pre-built generic providers ───────────────────────────────────
// These follow standard OAuth2 and need nothing beyond the base
// primitives. Grouped by category for clarity.

// -- Project Management --
export const JIRA_PROVIDER = genericOAuthProvider(
  'jira',
  'https://auth.atlassian.com/authorize',
  'https://auth.atlassian.com/oauth/token',
  'ATLASSIAN_CLIENT_ID',
  'ATLASSIAN_CLIENT_SECRET',
  { extraAuthorizeParams: { audience: 'api.atlassian.com', prompt: 'consent' } },
);

export const CONFLUENCE_PROVIDER = genericOAuthProvider(
  'confluence',
  'https://auth.atlassian.com/authorize',
  'https://auth.atlassian.com/oauth/token',
  'ATLASSIAN_CLIENT_ID',
  'ATLASSIAN_CLIENT_SECRET',
  { extraAuthorizeParams: { audience: 'api.atlassian.com', prompt: 'consent' } },
);

export const ASANA_PROVIDER = genericOAuthProvider(
  'asana',
  'https://app.asana.com/-/oauth_authorize',
  'https://app.asana.com/-/oauth_token',
  'ASANA_CLIENT_ID',
  'ASANA_CLIENT_SECRET',
);

export const TRELLO_PROVIDER = genericOAuthProvider(
  'trello',
  'https://trello.com/1/authorize',
  'https://trello.com/1/OAuthGetAccessToken',
  'TRELLO_API_KEY',
  'TRELLO_API_SECRET',
);

export const MONDAY_PROVIDER = genericOAuthProvider(
  'monday',
  'https://auth.monday.com/oauth2/authorize',
  'https://auth.monday.com/oauth2/token',
  'MONDAY_CLIENT_ID',
  'MONDAY_CLIENT_SECRET',
);

export const CLICKUP_PROVIDER = genericOAuthProvider(
  'clickup',
  'https://app.clickup.com/api',
  'https://api.clickup.com/api/v2/oauth/token',
  'CLICKUP_CLIENT_ID',
  'CLICKUP_CLIENT_SECRET',
);

export const BASECAMP_PROVIDER = genericOAuthProvider(
  'basecamp',
  'https://launchpad.37signals.com/authorization/new',
  'https://launchpad.37signals.com/authorization/token',
  'BASECAMP_CLIENT_ID',
  'BASECAMP_CLIENT_SECRET',
  { extraAuthorizeParams: { type: 'web_server' } },
);

export const WRIKE_PROVIDER = genericOAuthProvider(
  'wrike',
  'https://login.wrike.com/oauth2/authorize/v4',
  'https://login.wrike.com/oauth2/token',
  'WRIKE_CLIENT_ID',
  'WRIKE_CLIENT_SECRET',
);

export const TODOIST_PROVIDER = genericOAuthProvider(
  'todoist',
  'https://todoist.com/oauth/authorize',
  'https://todoist.com/oauth/access_token',
  'TODOIST_CLIENT_ID',
  'TODOIST_CLIENT_SECRET',
  { scopeSeparator: ',' },
);

// -- Communication --
export const MICROSOFT_TEAMS_PROVIDER = genericOAuthProvider(
  'microsoft_teams',
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  { extraAuthorizeParams: { prompt: 'consent' } },
);

export const DISCORD_PROVIDER = genericOAuthProvider(
  'discord',
  'https://discord.com/api/oauth2/authorize',
  'https://discord.com/api/oauth2/token',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
);

export const ZOOM_PROVIDER = genericOAuthProvider(
  'zoom',
  'https://zoom.us/oauth/authorize',
  'https://zoom.us/oauth/token',
  'ZOOM_CLIENT_ID',
  'ZOOM_CLIENT_SECRET',
);

// -- Calendar --
export const CALENDLY_PROVIDER = genericOAuthProvider(
  'calendly',
  'https://auth.calendly.com/oauth/authorize',
  'https://auth.calendly.com/oauth/token',
  'CALENDLY_CLIENT_ID',
  'CALENDLY_CLIENT_SECRET',
);

// -- CRM --
export const PIPEDRIVE_PROVIDER = genericOAuthProvider(
  'pipedrive',
  'https://oauth.pipedrive.com/oauth/authorize',
  'https://oauth.pipedrive.com/oauth/token',
  'PIPEDRIVE_CLIENT_ID',
  'PIPEDRIVE_CLIENT_SECRET',
);

export const ZOHO_CRM_PROVIDER = genericOAuthProvider(
  'zoho_crm',
  'https://accounts.zoho.com/oauth/v2/auth',
  'https://accounts.zoho.com/oauth/v2/token',
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  { extraAuthorizeParams: { access_type: 'offline', prompt: 'consent' } },
);

// -- Commerce --
export const SQUARE_PROVIDER = genericOAuthProvider(
  'square',
  'https://connect.squareup.com/oauth2/authorize',
  'https://connect.squareup.com/oauth2/token',
  'SQUARE_CLIENT_ID',
  'SQUARE_CLIENT_SECRET',
);

export const GUMROAD_PROVIDER = genericOAuthProvider(
  'gumroad',
  'https://gumroad.com/oauth/authorize',
  'https://api.gumroad.com/oauth/token',
  'GUMROAD_CLIENT_ID',
  'GUMROAD_CLIENT_SECRET',
);

// -- Social --
export const TWITTER_PROVIDER = genericOAuthProvider(
  'twitter',
  'https://twitter.com/i/oauth2/authorize',
  'https://api.twitter.com/2/oauth2/token',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  { extraAuthorizeParams: { code_challenge_method: 'plain' } },
);

export const LINKEDIN_PROVIDER = genericOAuthProvider(
  'linkedin',
  'https://www.linkedin.com/oauth/v2/authorization',
  'https://www.linkedin.com/oauth/v2/accessToken',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
);

export const INSTAGRAM_PROVIDER = genericOAuthProvider(
  'instagram',
  'https://www.facebook.com/v19.0/dialog/oauth',
  'https://graph.facebook.com/v19.0/oauth/access_token',
  'META_APP_ID',
  'META_APP_SECRET',
);

export const TIKTOK_PROVIDER = genericOAuthProvider(
  'tiktok',
  'https://www.tiktok.com/v2/auth/authorize/',
  'https://open.tiktokapis.com/v2/oauth/token/',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
);

export const BUFFER_PROVIDER = genericOAuthProvider(
  'buffer',
  'https://bufferapp.com/oauth2/authorize',
  'https://api.bufferapp.com/1/oauth2/token.json',
  'BUFFER_CLIENT_ID',
  'BUFFER_CLIENT_SECRET',
);

export const YOUTUBE_PROVIDER = genericOAuthProvider(
  'youtube',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  { extraAuthorizeParams: { access_type: 'offline', prompt: 'consent' } },
);

// -- Advertising --
export const TIKTOK_ADS_PROVIDER = genericOAuthProvider(
  'tiktok_ads',
  'https://business-api.tiktok.com/portal/auth',
  'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
  'TIKTOK_ADS_APP_ID',
  'TIKTOK_ADS_SECRET',
);

export const LINKEDIN_ADS_PROVIDER = genericOAuthProvider(
  'linkedin_ads',
  'https://www.linkedin.com/oauth/v2/authorization',
  'https://www.linkedin.com/oauth/v2/accessToken',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
);

// -- Design --
export const CANVA_PROVIDER = genericOAuthProvider(
  'canva',
  'https://www.canva.com/api/oauth/authorize',
  'https://api.canva.com/rest/v1/oauth/token',
  'CANVA_CLIENT_ID',
  'CANVA_CLIENT_SECRET',
);

export const MIRO_PROVIDER = genericOAuthProvider(
  'miro',
  'https://miro.com/oauth/authorize',
  'https://api.miro.com/v1/oauth/token',
  'MIRO_CLIENT_ID',
  'MIRO_CLIENT_SECRET',
);

export const ADOBE_CREATIVE_CLOUD_PROVIDER = genericOAuthProvider(
  'adobe_creative_cloud',
  'https://ims-na1.adobelogin.com/ims/authorize/v2',
  'https://ims-na1.adobelogin.com/ims/token/v3',
  'ADOBE_CLIENT_ID',
  'ADOBE_CLIENT_SECRET',
);

export const SKETCH_PROVIDER = genericOAuthProvider(
  'sketch',
  'https://www.sketch.com/oauth/authorize',
  'https://www.sketch.com/oauth/token',
  'SKETCH_CLIENT_ID',
  'SKETCH_CLIENT_SECRET',
);

// -- Cloud Storage --
export const GOOGLE_DRIVE_PROVIDER = genericOAuthProvider(
  'google_drive',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  { extraAuthorizeParams: { access_type: 'offline', prompt: 'consent' } },
);

export const DROPBOX_PROVIDER = genericOAuthProvider(
  'dropbox',
  'https://www.dropbox.com/oauth2/authorize',
  'https://api.dropboxapi.com/oauth2/token',
  'DROPBOX_CLIENT_ID',
  'DROPBOX_CLIENT_SECRET',
  { extraAuthorizeParams: { token_access_type: 'offline' } },
);

export const ONEDRIVE_PROVIDER = genericOAuthProvider(
  'onedrive',
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  { extraAuthorizeParams: { prompt: 'consent' } },
);

export const BOX_PROVIDER = genericOAuthProvider(
  'box',
  'https://account.box.com/api/oauth2/authorize',
  'https://api.box.com/oauth2/token',
  'BOX_CLIENT_ID',
  'BOX_CLIENT_SECRET',
);

// -- Forms --
export const SURVEYMONKEY_PROVIDER = genericOAuthProvider(
  'surveymonkey',
  'https://api.surveymonkey.com/oauth/authorize',
  'https://api.surveymonkey.com/oauth/token',
  'SURVEYMONKEY_CLIENT_ID',
  'SURVEYMONKEY_CLIENT_SECRET',
);

// -- Support --
export const ZENDESK_PROVIDER = genericOAuthProvider(
  'zendesk',
  'https://d3v-grid.zendesk.com/oauth/authorizations/new',
  'https://d3v-grid.zendesk.com/oauth/tokens',
  'ZENDESK_CLIENT_ID',
  'ZENDESK_CLIENT_SECRET',
);

export const INTERCOM_PROVIDER = genericOAuthProvider(
  'intercom',
  'https://app.intercom.com/oauth',
  'https://api.intercom.io/auth/eagle/token',
  'INTERCOM_CLIENT_ID',
  'INTERCOM_CLIENT_SECRET',
);

export const HELPSCOUT_PROVIDER = genericOAuthProvider(
  'helpscout',
  'https://secure.helpscout.net/authentication/authorizeClientApplication',
  'https://api.helpscout.net/v2/oauth2/token',
  'HELPSCOUT_CLIENT_ID',
  'HELPSCOUT_CLIENT_SECRET',
);

// -- Finance --
export const QUICKBOOKS_PROVIDER = genericOAuthProvider(
  'quickbooks',
  'https://appcenter.intuit.com/connect/oauth2',
  'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  'QUICKBOOKS_CLIENT_ID',
  'QUICKBOOKS_CLIENT_SECRET',
);

export const XERO_PROVIDER = genericOAuthProvider(
  'xero',
  'https://login.xero.com/identity/connect/authorize',
  'https://identity.xero.com/connect/token',
  'XERO_CLIENT_ID',
  'XERO_CLIENT_SECRET',
);

export const FRESHBOOKS_PROVIDER = genericOAuthProvider(
  'freshbooks',
  'https://auth.freshbooks.com/oauth/authorize',
  'https://api.freshbooks.com/auth/oauth/token',
  'FRESHBOOKS_CLIENT_ID',
  'FRESHBOOKS_CLIENT_SECRET',
);

export const WAVE_PROVIDER = genericOAuthProvider(
  'wave',
  'https://api.waveapps.com/oauth2/authorize/',
  'https://api.waveapps.com/oauth2/token/',
  'WAVE_CLIENT_ID',
  'WAVE_CLIENT_SECRET',
);

// -- HR --
export const GUSTO_PROVIDER = genericOAuthProvider(
  'gusto',
  'https://api.gusto.com/oauth/authorize',
  'https://api.gusto.com/oauth/token',
  'GUSTO_CLIENT_ID',
  'GUSTO_CLIENT_SECRET',
);

export const RIPPLING_PROVIDER = genericOAuthProvider(
  'rippling',
  'https://app.rippling.com/apps/PLATFORM/authorize',
  'https://app.rippling.com/api/o/token/',
  'RIPPLING_CLIENT_ID',
  'RIPPLING_CLIENT_SECRET',
);

// -- Video --
export const LOOM_PROVIDER = genericOAuthProvider(
  'loom',
  'https://www.loom.com/oauth/authorize',
  'https://www.loom.com/oauth/token',
  'LOOM_CLIENT_ID',
  'LOOM_CLIENT_SECRET',
);

export const VIMEO_PROVIDER = genericOAuthProvider(
  'vimeo',
  'https://api.vimeo.com/oauth/authorize',
  'https://api.vimeo.com/oauth/access_token',
  'VIMEO_CLIENT_ID',
  'VIMEO_CLIENT_SECRET',
);

// -- Developer Tools --
export const GITLAB_PROVIDER = genericOAuthProvider(
  'gitlab',
  'https://gitlab.com/oauth/authorize',
  'https://gitlab.com/oauth/token',
  'GITLAB_CLIENT_ID',
  'GITLAB_CLIENT_SECRET',
);

export const BITBUCKET_PROVIDER = genericOAuthProvider(
  'bitbucket',
  'https://bitbucket.org/site/oauth2/authorize',
  'https://bitbucket.org/site/oauth2/access_token',
  'BITBUCKET_CLIENT_ID',
  'BITBUCKET_CLIENT_SECRET',
);

export const VERCEL_PROVIDER = genericOAuthProvider(
  'vercel',
  'https://vercel.com/integrations/oauth/authorize',
  'https://api.vercel.com/v2/oauth/access_token',
  'VERCEL_CLIENT_ID',
  'VERCEL_CLIENT_SECRET',
);

export const SENTRY_PROVIDER = genericOAuthProvider(
  'sentry',
  'https://sentry.io/oauth/authorize/',
  'https://sentry.io/oauth/token/',
  'SENTRY_CLIENT_ID',
  'SENTRY_CLIENT_SECRET',
);

// -- Infrastructure --
export const NETLIFY_PROVIDER = genericOAuthProvider(
  'netlify',
  'https://app.netlify.com/authorize',
  'https://api.netlify.com/oauth/token',
  'NETLIFY_CLIENT_ID',
  'NETLIFY_CLIENT_SECRET',
);
