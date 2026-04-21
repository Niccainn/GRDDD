/**
 * GET /api/integrations/oauth/[provider]/start?environmentId=...
 *
 * Kicks off the OAuth dance for a provider. We:
 *   1. Verify the caller can administer the target environment.
 *   2. Generate a random `state` value, HMAC-bound to the
 *      environmentId, and store it in an HttpOnly short-lived cookie
 *      so the callback can verify the request came from us.
 *   3. Redirect to the provider's authorize URL.
 *
 * The callback handler reads the cookie, confirms the state matches,
 * reads environmentId from the cookie payload (NOT from URL params
 * on the callback — that would let an attacker redirect the token
 * to a different environment).
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { findProvider } from '@/lib/integrations/registry';
import { getAdministrableEnvironment } from '@/lib/integrations/access';
import { buildAuthorizeUrl, generateState } from '@/lib/integrations/oauth/base';
import { META_PROVIDER } from '@/lib/integrations/oauth/meta';
import {
  GOOGLE_ADS_PROVIDER,
  GOOGLE_ANALYTICS_PROVIDER,
  GOOGLE_SEARCH_CONSOLE_PROVIDER,
  GOOGLE_WORKSPACE_PROVIDER,
  GOOGLE_CALENDAR_PROVIDER,
} from '@/lib/integrations/oauth/google';
import { MICROSOFT_OUTLOOK_PROVIDER } from '@/lib/integrations/oauth/microsoft';
import { SALESFORCE_PROVIDER } from '@/lib/integrations/oauth/salesforce';
import { HUBSPOT_PROVIDER } from '@/lib/integrations/oauth/hubspot';
import { SLACK_PROVIDER } from '@/lib/integrations/oauth/slack';
import { GITHUB_PROVIDER } from '@/lib/integrations/oauth/github';
import { LINEAR_PROVIDER } from '@/lib/integrations/oauth/linear';
import { NOTION_PROVIDER } from '@/lib/integrations/oauth/notion';
import { FIGMA_PROVIDER } from '@/lib/integrations/oauth/figma';
import { buildShopifyAuthorizeUrl } from '@/lib/integrations/oauth/shopify';
import { MAILCHIMP_PROVIDER } from '@/lib/integrations/oauth/mailchimp';
import { buildAirtableAuthorizeUrl } from '@/lib/integrations/oauth/airtable';
import { TYPEFORM_PROVIDER } from '@/lib/integrations/oauth/typeform';
import {
  JIRA_PROVIDER,
  CONFLUENCE_PROVIDER,
  ASANA_PROVIDER,
  TRELLO_PROVIDER,
  MONDAY_PROVIDER,
  CLICKUP_PROVIDER,
  BASECAMP_PROVIDER,
  WRIKE_PROVIDER,
  TODOIST_PROVIDER,
  MICROSOFT_TEAMS_PROVIDER,
  DISCORD_PROVIDER,
  ZOOM_PROVIDER,
  CALENDLY_PROVIDER,
  PIPEDRIVE_PROVIDER,
  ZOHO_CRM_PROVIDER,
  SQUARE_PROVIDER,
  GUMROAD_PROVIDER,
  TWITTER_PROVIDER,
  LINKEDIN_PROVIDER,
  INSTAGRAM_PROVIDER,
  TIKTOK_PROVIDER,
  BUFFER_PROVIDER,
  YOUTUBE_PROVIDER,
  TIKTOK_ADS_PROVIDER,
  LINKEDIN_ADS_PROVIDER,
  CANVA_PROVIDER,
  MIRO_PROVIDER,
  ADOBE_CREATIVE_CLOUD_PROVIDER,
  SKETCH_PROVIDER,
  GOOGLE_DRIVE_PROVIDER,
  DROPBOX_PROVIDER,
  ONEDRIVE_PROVIDER,
  BOX_PROVIDER,
  SURVEYMONKEY_PROVIDER,
  ZENDESK_PROVIDER,
  INTERCOM_PROVIDER,
  HELPSCOUT_PROVIDER,
  QUICKBOOKS_PROVIDER,
  XERO_PROVIDER,
  FRESHBOOKS_PROVIDER,
  WAVE_PROVIDER,
  GUSTO_PROVIDER,
  RIPPLING_PROVIDER,
  LOOM_PROVIDER,
  VIMEO_PROVIDER,
  GITLAB_PROVIDER,
  BITBUCKET_PROVIDER,
  VERCEL_PROVIDER,
  SENTRY_PROVIDER,
  NETLIFY_PROVIDER,
} from '@/lib/integrations/oauth/generic';

const STATE_COOKIE_PREFIX = 'grid_int_state_';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await params;
  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const def = findProvider(provider);
  if (!def) return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  if (def.authType !== 'oauth') {
    return Response.json(
      { error: `${def.name} is an ${def.authType} provider, use POST /api/integrations instead` },
      { status: 400 },
    );
  }
  if (!def.implemented) {
    return Response.json({ error: `${def.name} is not yet implemented` }, { status: 400 });
  }

  // Provider dispatcher — each implemented OAuth provider plugs in
  // here. We keep the switch explicit rather than dynamic-import so
  // static analysis can see which providers are actually wired.
  let authorizeUrl: string;
  const state = generateState();

  // Airtable PKCE: we need to store the code_verifier in the cookie.
  let airtableCodeVerifier: string | undefined;

  try {
    if (provider === 'meta_ads') {
      authorizeUrl = buildAuthorizeUrl(META_PROVIDER, def.scopes, state);
    } else if (provider === 'google_ads') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_ADS_PROVIDER, def.scopes, state);
    } else if (provider === 'google_analytics') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_ANALYTICS_PROVIDER, def.scopes, state);
    } else if (provider === 'google_search_console') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_SEARCH_CONSOLE_PROVIDER, def.scopes, state);
    } else if (provider === 'google_workspace') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_WORKSPACE_PROVIDER, def.scopes, state);
    } else if (provider === 'salesforce') {
      authorizeUrl = buildAuthorizeUrl(SALESFORCE_PROVIDER, def.scopes, state);
    } else if (provider === 'hubspot') {
      authorizeUrl = buildAuthorizeUrl(HUBSPOT_PROVIDER, def.scopes, state);
    } else if (provider === 'slack') {
      authorizeUrl = buildAuthorizeUrl(SLACK_PROVIDER, def.scopes, state);
    } else if (provider === 'github') {
      authorizeUrl = buildAuthorizeUrl(GITHUB_PROVIDER, def.scopes, state);
    } else if (provider === 'linear') {
      authorizeUrl = buildAuthorizeUrl(LINEAR_PROVIDER, def.scopes, state);
    } else if (provider === 'notion') {
      authorizeUrl = buildAuthorizeUrl(NOTION_PROVIDER, def.scopes, state);
    } else if (provider === 'figma') {
      authorizeUrl = buildAuthorizeUrl(FIGMA_PROVIDER, def.scopes, state);
    } else if (provider === 'google_calendar') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_CALENDAR_PROVIDER, def.scopes, state);
    } else if (provider === 'microsoft_outlook') {
      authorizeUrl = buildAuthorizeUrl(MICROSOFT_OUTLOOK_PROVIDER, def.scopes, state);

    // ── New dedicated providers ─────────────────────────────────
    } else if (provider === 'shopify') {
      const shop = req.nextUrl.searchParams.get('shop');
      if (!shop) {
        return Response.json({ error: 'shop query param required for Shopify' }, { status: 400 });
      }
      authorizeUrl = buildShopifyAuthorizeUrl(shop, def.scopes, state);
    } else if (provider === 'mailchimp') {
      authorizeUrl = buildAuthorizeUrl(MAILCHIMP_PROVIDER, def.scopes, state);
    } else if (provider === 'airtable') {
      const result = await buildAirtableAuthorizeUrl(def.scopes, state);
      authorizeUrl = result.authorizeUrl;
      airtableCodeVerifier = result.codeVerifier;
    } else if (provider === 'typeform') {
      authorizeUrl = buildAuthorizeUrl(TYPEFORM_PROVIDER, def.scopes, state);

    // ── Generic providers (standard OAuth2) ─────────────────────
    // Project Management
    } else if (provider === 'jira') {
      authorizeUrl = buildAuthorizeUrl(JIRA_PROVIDER, def.scopes, state);
    } else if (provider === 'confluence') {
      authorizeUrl = buildAuthorizeUrl(CONFLUENCE_PROVIDER, def.scopes, state);
    } else if (provider === 'asana') {
      authorizeUrl = buildAuthorizeUrl(ASANA_PROVIDER, def.scopes, state);
    } else if (provider === 'trello') {
      authorizeUrl = buildAuthorizeUrl(TRELLO_PROVIDER, def.scopes, state);
    } else if (provider === 'monday') {
      authorizeUrl = buildAuthorizeUrl(MONDAY_PROVIDER, def.scopes, state);
    } else if (provider === 'clickup') {
      authorizeUrl = buildAuthorizeUrl(CLICKUP_PROVIDER, def.scopes, state);
    } else if (provider === 'basecamp') {
      authorizeUrl = buildAuthorizeUrl(BASECAMP_PROVIDER, def.scopes, state);
    } else if (provider === 'wrike') {
      authorizeUrl = buildAuthorizeUrl(WRIKE_PROVIDER, def.scopes, state);
    } else if (provider === 'todoist') {
      authorizeUrl = buildAuthorizeUrl(TODOIST_PROVIDER, def.scopes, state);

    // Communication
    } else if (provider === 'microsoft_teams') {
      authorizeUrl = buildAuthorizeUrl(MICROSOFT_TEAMS_PROVIDER, def.scopes, state);
    } else if (provider === 'discord') {
      authorizeUrl = buildAuthorizeUrl(DISCORD_PROVIDER, def.scopes, state);
    } else if (provider === 'zoom') {
      authorizeUrl = buildAuthorizeUrl(ZOOM_PROVIDER, def.scopes, state);

    // Calendar
    } else if (provider === 'calendly') {
      authorizeUrl = buildAuthorizeUrl(CALENDLY_PROVIDER, def.scopes, state);

    // CRM
    } else if (provider === 'pipedrive') {
      authorizeUrl = buildAuthorizeUrl(PIPEDRIVE_PROVIDER, def.scopes, state);
    } else if (provider === 'zoho_crm') {
      authorizeUrl = buildAuthorizeUrl(ZOHO_CRM_PROVIDER, def.scopes, state);

    // Commerce
    } else if (provider === 'square') {
      authorizeUrl = buildAuthorizeUrl(SQUARE_PROVIDER, def.scopes, state);
    } else if (provider === 'gumroad') {
      authorizeUrl = buildAuthorizeUrl(GUMROAD_PROVIDER, def.scopes, state);

    // Social
    } else if (provider === 'twitter') {
      authorizeUrl = buildAuthorizeUrl(TWITTER_PROVIDER, def.scopes, state);
    } else if (provider === 'linkedin') {
      authorizeUrl = buildAuthorizeUrl(LINKEDIN_PROVIDER, def.scopes, state);
    } else if (provider === 'instagram') {
      authorizeUrl = buildAuthorizeUrl(INSTAGRAM_PROVIDER, def.scopes, state);
    } else if (provider === 'tiktok') {
      authorizeUrl = buildAuthorizeUrl(TIKTOK_PROVIDER, def.scopes, state);
    } else if (provider === 'buffer') {
      authorizeUrl = buildAuthorizeUrl(BUFFER_PROVIDER, def.scopes, state);
    } else if (provider === 'youtube') {
      authorizeUrl = buildAuthorizeUrl(YOUTUBE_PROVIDER, def.scopes, state);

    // Advertising
    } else if (provider === 'tiktok_ads') {
      authorizeUrl = buildAuthorizeUrl(TIKTOK_ADS_PROVIDER, def.scopes, state);
    } else if (provider === 'linkedin_ads') {
      authorizeUrl = buildAuthorizeUrl(LINKEDIN_ADS_PROVIDER, def.scopes, state);

    // Design
    } else if (provider === 'canva') {
      authorizeUrl = buildAuthorizeUrl(CANVA_PROVIDER, def.scopes, state);
    } else if (provider === 'miro') {
      authorizeUrl = buildAuthorizeUrl(MIRO_PROVIDER, def.scopes, state);
    } else if (provider === 'adobe_creative_cloud') {
      authorizeUrl = buildAuthorizeUrl(ADOBE_CREATIVE_CLOUD_PROVIDER, def.scopes, state);
    } else if (provider === 'sketch') {
      authorizeUrl = buildAuthorizeUrl(SKETCH_PROVIDER, def.scopes, state);

    // Cloud Storage
    } else if (provider === 'google_drive') {
      authorizeUrl = buildAuthorizeUrl(GOOGLE_DRIVE_PROVIDER, def.scopes, state);
    } else if (provider === 'dropbox') {
      authorizeUrl = buildAuthorizeUrl(DROPBOX_PROVIDER, def.scopes, state);
    } else if (provider === 'onedrive') {
      authorizeUrl = buildAuthorizeUrl(ONEDRIVE_PROVIDER, def.scopes, state);
    } else if (provider === 'box') {
      authorizeUrl = buildAuthorizeUrl(BOX_PROVIDER, def.scopes, state);

    // Forms
    } else if (provider === 'surveymonkey') {
      authorizeUrl = buildAuthorizeUrl(SURVEYMONKEY_PROVIDER, def.scopes, state);

    // Support
    } else if (provider === 'zendesk') {
      authorizeUrl = buildAuthorizeUrl(ZENDESK_PROVIDER, def.scopes, state);
    } else if (provider === 'intercom') {
      authorizeUrl = buildAuthorizeUrl(INTERCOM_PROVIDER, def.scopes, state);
    } else if (provider === 'helpscout') {
      authorizeUrl = buildAuthorizeUrl(HELPSCOUT_PROVIDER, def.scopes, state);

    // Finance
    } else if (provider === 'quickbooks') {
      authorizeUrl = buildAuthorizeUrl(QUICKBOOKS_PROVIDER, def.scopes, state);
    } else if (provider === 'xero') {
      authorizeUrl = buildAuthorizeUrl(XERO_PROVIDER, def.scopes, state);
    } else if (provider === 'freshbooks') {
      authorizeUrl = buildAuthorizeUrl(FRESHBOOKS_PROVIDER, def.scopes, state);
    } else if (provider === 'wave') {
      authorizeUrl = buildAuthorizeUrl(WAVE_PROVIDER, def.scopes, state);

    // HR
    } else if (provider === 'gusto') {
      authorizeUrl = buildAuthorizeUrl(GUSTO_PROVIDER, def.scopes, state);
    } else if (provider === 'rippling') {
      authorizeUrl = buildAuthorizeUrl(RIPPLING_PROVIDER, def.scopes, state);

    // Video
    } else if (provider === 'loom') {
      authorizeUrl = buildAuthorizeUrl(LOOM_PROVIDER, def.scopes, state);
    } else if (provider === 'vimeo') {
      authorizeUrl = buildAuthorizeUrl(VIMEO_PROVIDER, def.scopes, state);

    // Developer Tools
    } else if (provider === 'gitlab') {
      authorizeUrl = buildAuthorizeUrl(GITLAB_PROVIDER, def.scopes, state);
    } else if (provider === 'bitbucket') {
      authorizeUrl = buildAuthorizeUrl(BITBUCKET_PROVIDER, def.scopes, state);
    } else if (provider === 'vercel') {
      authorizeUrl = buildAuthorizeUrl(VERCEL_PROVIDER, def.scopes, state);
    } else if (provider === 'sentry') {
      authorizeUrl = buildAuthorizeUrl(SENTRY_PROVIDER, def.scopes, state);

    // Infrastructure
    } else if (provider === 'netlify') {
      authorizeUrl = buildAuthorizeUrl(NETLIFY_PROVIDER, def.scopes, state);
    } else {
      return Response.json(
        { error: `No OAuth start handler implemented for ${provider}` },
        { status: 400 },
      );
    }
  } catch (err) {
    // Missing env var at this stage = operator hasn't registered the
    // OAuth app yet. Surface the underlying message so the dev sees
    // "Missing required env var: META_APP_ID" and knows what to do.
    const message = err instanceof Error ? err.message : 'Failed to build authorize URL';
    return Response.json({ error: message }, { status: 500 });
  }

  // Cookie payload: <state>.<environmentId>[.<extra>]. The environmentId is
  // NOT confidential but binding it to the cookie prevents a
  // redirect-spoofing attack where a token gets stored under a
  // different environment than the one the user kicked off from.
  //
  // For Shopify: state.environmentId.shop
  // For Airtable: state.environmentId.codeVerifier
  let payload = `${state}.${environmentId}`;
  if (provider === 'shopify') {
    const shop = req.nextUrl.searchParams.get('shop')!;
    payload = `${state}.${environmentId}.${shop}`;
  } else if (provider === 'airtable' && airtableCodeVerifier) {
    payload = `${state}.${environmentId}.${airtableCodeVerifier}`;
  }

  // Same-origin redirect path piggybacks on the state cookie — the
  // caller (e.g. /welcome onboarding) wants the callback to drop
  // them back where they started, not the default /integrations.
  // Validate strictly: must start with "/" and not "//" (no
  // protocol-relative URLs) to prevent open-redirect.
  const redirectParam = req.nextUrl.searchParams.get('redirect');
  if (redirectParam && /^\/(?!\/)[^\s]*$/.test(redirectParam) && redirectParam.length < 256) {
    const redirectCookie = await cookies();
    redirectCookie.set(`${STATE_COOKIE_PREFIX}${provider}_redir`, redirectParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes to complete the flow
    path: '/',
  });

  return Response.redirect(authorizeUrl, 302);
}
