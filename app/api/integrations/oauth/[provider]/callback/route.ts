/**
 * GET /api/integrations/oauth/[provider]/callback?code=...&state=...
 *
 * The redirect_uri every OAuth provider calls back to. We:
 *   1. Read the state cookie set by /start, verify the state matches,
 *      and extract the environmentId from it.
 *   2. Re-check admin permission on that environment (cookie alone
 *      isn't enough — the caller might have been removed between
 *      /start and /callback).
 *   3. Exchange the `code` for access/refresh tokens via the provider
 *      module.
 *   4. Fetch any provider-specific metadata (accountLabel, display
 *      name, instance URLs, etc.) so the Integration row is
 *      self-sufficient for future API calls.
 *   5. Encrypt + persist, redirect back to /integrations with a
 *      success flag.
 *
 * Each provider branch does its own token exchange + metadata fetch,
 * then hands a uniform `persist(...)` call the shared write path.
 * This keeps the Prisma write logic in exactly one place.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptString, buildKeyPreview } from '@/lib/crypto/key-encryption';
import { findProvider } from '@/lib/integrations/registry';
import { getAdministrableEnvironment } from '@/lib/integrations/access';
import { completeMetaOAuth, listMetaAdAccounts } from '@/lib/integrations/oauth/meta';
import {
  GOOGLE_ADS_PROVIDER,
  GOOGLE_ANALYTICS_PROVIDER,
  GOOGLE_SEARCH_CONSOLE_PROVIDER,
  GOOGLE_WORKSPACE_PROVIDER,
  GOOGLE_CALENDAR_PROVIDER,
  completeGoogleOAuth,
} from '@/lib/integrations/oauth/google';
import { MICROSOFT_OUTLOOK_PROVIDER, getMicrosoftUser } from '@/lib/integrations/oauth/microsoft';
import { SALESFORCE_PROVIDER, completeSalesforceOAuth } from '@/lib/integrations/oauth/salesforce';
import { HUBSPOT_PROVIDER, getHubSpotAccountInfo } from '@/lib/integrations/oauth/hubspot';
import { completeSlackOAuth } from '@/lib/integrations/oauth/slack';
import { GITHUB_PROVIDER, getGitHubUser } from '@/lib/integrations/oauth/github';
import { LINEAR_PROVIDER } from '@/lib/integrations/oauth/linear';
import { completeNotionOAuth } from '@/lib/integrations/oauth/notion';
import { FIGMA_PROVIDER, getFigmaUser } from '@/lib/integrations/oauth/figma';
import { exchangeCodeForTokens, buildRedirectUri } from '@/lib/integrations/oauth/base';
import { completeShopifyOAuth, getShopInfo } from '@/lib/integrations/oauth/shopify';
import { completeMailchimpOAuth } from '@/lib/integrations/oauth/mailchimp';
import { exchangeAirtableCode, getAirtableUser } from '@/lib/integrations/oauth/airtable';
import { TYPEFORM_PROVIDER, getTypeformUser } from '@/lib/integrations/oauth/typeform';
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

function redirectBack(environmentId: string | null, status: 'success' | 'error', message?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const url = new URL('/integrations', base);
  if (environmentId) url.searchParams.set('environmentId', environmentId);
  url.searchParams.set('oauth', status);
  if (message) url.searchParams.set('message', message);
  return Response.redirect(url.toString(), 302);
}

/** Shared persist helper — each branch prepares its inputs then calls this. */
async function persistIntegration(args: {
  environmentId: string;
  provider: string;
  accountLabel: string;
  displayName: string;
  credentialsObject: Record<string, unknown>;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
  previewSource: string;
  createdById: string;
}) {
  const {
    environmentId, provider, accountLabel, displayName,
    credentialsObject, refreshToken, expiresAt, scopes, previewSource, createdById,
  } = args;

  const credsJson = JSON.stringify(credentialsObject);
  const ciphertext = encryptString(credsJson);
  const preview = buildKeyPreview(previewSource);
  const refreshTokenEnc = refreshToken ? encryptString(refreshToken) : null;

  const existing = await prisma.integration.findFirst({
    where: { environmentId, provider, accountLabel, deletedAt: null },
    select: { id: true },
  });

  const data = {
    displayName,
    credentialsEnc: ciphertext,
    credentialsPreview: preview,
    refreshTokenEnc,
    status: 'ACTIVE',
    expiresAt,
    lastSyncedAt: new Date(),
    lastError: null,
    lastErrorAt: null,
    scopes: JSON.stringify(scopes),
  };
  if (existing) {
    await prisma.integration.update({ where: { id: existing.id }, data });
  } else {
    await prisma.integration.create({
      data: { ...data, environmentId, provider, accountLabel, authType: 'oauth', createdById },
    });
  }
}

/**
 * Generic callback handler for standard OAuth2 providers.
 * Exchanges code for tokens and persists with a basic label.
 */
async function handleGenericOAuthCallback(args: {
  provider: import('@/lib/integrations/oauth/base').OAuthProvider;
  providerId: string;
  providerName: string;
  code: string;
  environmentId: string;
  scopes: string[];
  createdById: string;
  /** Optional: fetch profile info for a friendlier label. Returns { accountLabel, displayName }. */
  fetchProfile?: (accessToken: string) => Promise<{ accountLabel: string; displayName: string }>;
}) {
  const { provider, providerId, providerName, code, environmentId, scopes, createdById, fetchProfile } = args;
  const tokens = await exchangeCodeForTokens(provider, code);

  let accountLabel = 'default';
  let displayName = providerName;

  if (fetchProfile) {
    try {
      const profile = await fetchProfile(tokens.access_token);
      accountLabel = profile.accountLabel;
      displayName = profile.displayName;
    } catch {
      // Fall through with defaults if profile fetch fails.
    }
  }

  await persistIntegration({
    environmentId,
    provider: providerId,
    accountLabel,
    displayName,
    credentialsObject: { accessToken: tokens.access_token },
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    scopes,
    previewSource: tokens.access_token,
    createdById,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return redirectBack(null, 'error', 'Session expired — please sign in and try again');

  const { provider } = await params;
  const def = findProvider(provider);
  if (!def || def.authType !== 'oauth' || !def.implemented) {
    return redirectBack(null, 'error', `Unknown provider: ${provider}`);
  }

  const code = req.nextUrl.searchParams.get('code');
  const returnedState = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  if (oauthError) {
    return redirectBack(null, 'error', req.nextUrl.searchParams.get('error_description') ?? oauthError);
  }
  if (!code || !returnedState) {
    return redirectBack(null, 'error', 'Missing code or state from provider');
  }

  const cookieStore = await cookies();
  const cookieName = `${STATE_COOKIE_PREFIX}${provider}`;
  const cookieVal = cookieStore.get(cookieName)?.value;
  if (!cookieVal) return redirectBack(null, 'error', 'State cookie missing or expired');

  // Cookie format: state.environmentId[.extra]
  // Extra segment is used for Shopify (shop domain) and Airtable (code_verifier).
  const cookieParts = cookieVal.split('.');
  const storedState = cookieParts[0];
  const environmentId = cookieParts[1];
  const cookieExtra = cookieParts.slice(2).join('.'); // rejoin in case extra contains dots

  if (storedState !== returnedState) {
    return redirectBack(null, 'error', 'State mismatch — possible CSRF, aborting');
  }
  cookieStore.delete(cookieName);

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return redirectBack(null, 'error', 'Environment not found or access revoked');

  try {
    // ── Original dedicated providers ──────────────────────────────

    if (provider === 'meta_ads') {
      const tokens = await completeMetaOAuth(code);
      const accounts = await listMetaAdAccounts(tokens.access_token);
      if (accounts.length === 0) return redirectBack(environmentId, 'error', 'No Meta ad accounts found');
      const primary = accounts[0];
      await persistIntegration({
        environmentId,
        provider: 'meta_ads',
        accountLabel: primary.id,
        displayName: `Meta Ads · ${primary.name}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'google_ads' || provider === 'google_analytics' || provider === 'google_search_console' || provider === 'google_workspace' || provider === 'google_calendar') {
      const googleProv = {
        google_ads: GOOGLE_ADS_PROVIDER,
        google_analytics: GOOGLE_ANALYTICS_PROVIDER,
        google_search_console: GOOGLE_SEARCH_CONSOLE_PROVIDER,
        google_workspace: GOOGLE_WORKSPACE_PROVIDER,
        google_calendar: GOOGLE_CALENDAR_PROVIDER,
      }[provider];
      const tokens = await completeGoogleOAuth(googleProv, code);

      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = (await userInfoRes.json()) as { email: string; name?: string };

      let accountLabel = userInfo.email;
      let displayName = `${def.name} · ${userInfo.email}`;

      if (provider === 'google_ads') {
        try {
          const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
          if (devToken) {
            const res = await fetch('https://googleads.googleapis.com/v16/customers:listAccessibleCustomers', {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'developer-token': devToken,
              },
            });
            if (res.ok) {
              const data = (await res.json()) as { resourceNames?: string[] };
              const first = data.resourceNames?.[0]?.split('/')[1];
              if (first) {
                accountLabel = first;
                displayName = `Google Ads · ${first}`;
              }
            }
          }
        } catch {
          // Fall through with email label.
        }
      } else if (provider === 'google_analytics') {
        try {
          const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (res.ok) {
            const data = (await res.json()) as {
              accountSummaries?: { displayName: string; propertySummaries?: { property: string; displayName: string }[] }[];
            };
            const firstProp = data.accountSummaries?.[0]?.propertySummaries?.[0];
            if (firstProp) {
              accountLabel = firstProp.property;
              displayName = `Google Analytics · ${firstProp.displayName}`;
            }
          }
        } catch { /* ignore */ }
      } else if (provider === 'google_search_console') {
        try {
          const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
            const first = data.siteEntry?.find(s => s.permissionLevel !== 'siteUnverifiedUser');
            if (first) {
              accountLabel = first.siteUrl;
              displayName = `Search Console · ${first.siteUrl}`;
            }
          }
        } catch { /* ignore */ }
      } else if (provider === 'google_calendar') {
        try {
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string; summary: string };
            accountLabel = data.id;
            displayName = `Google Calendar · ${data.summary || data.id}`;
          }
        } catch { /* ignore */ }
      }

      await persistIntegration({
        environmentId,
        provider,
        accountLabel,
        displayName,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'salesforce') {
      const tokens = await completeSalesforceOAuth(code);
      const orgId = tokens.id.split('/').slice(-2, -1)[0] ?? 'unknown';
      await persistIntegration({
        environmentId,
        provider: 'salesforce',
        accountLabel: orgId,
        displayName: `Salesforce · ${new URL(tokens.instance_url).hostname}`,
        credentialsObject: { accessToken: tokens.access_token, instanceUrl: tokens.instance_url },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'hubspot') {
      const tokens = await exchangeCodeForTokens(HUBSPOT_PROVIDER, code);
      const info = await getHubSpotAccountInfo(tokens.access_token);
      await persistIntegration({
        environmentId,
        provider: 'hubspot',
        accountLabel: String(info.portalId),
        displayName: `HubSpot · ${info.uiDomain}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'slack') {
      const result = await completeSlackOAuth(code, buildRedirectUri('slack'));
      await persistIntegration({
        environmentId,
        provider: 'slack',
        accountLabel: result.team.id,
        displayName: `Slack · ${result.team.name}`,
        credentialsObject: { accessToken: result.access_token, botUserId: result.bot_user_id },
        refreshToken: null,
        expiresAt: null,
        scopes: def.scopes,
        previewSource: result.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'github') {
      const tokens = await exchangeCodeForTokens(GITHUB_PROVIDER, code);
      const user = await getGitHubUser(tokens.access_token);
      await persistIntegration({
        environmentId,
        provider: 'github',
        accountLabel: user.login,
        displayName: `GitHub · ${user.login}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'linear') {
      const tokens = await exchangeCodeForTokens(LINEAR_PROVIDER, code);
      const viewerRes = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ viewer { id name email } organization { id name } }' }),
      });
      const viewerData = (await viewerRes.json()) as {
        data?: { viewer: { id: string; name: string }; organization: { id: string; name: string } };
      };
      const orgId = viewerData.data?.organization.id ?? 'unknown';
      const orgName = viewerData.data?.organization.name ?? 'Linear';
      await persistIntegration({
        environmentId,
        provider: 'linear',
        accountLabel: orgId,
        displayName: `Linear · ${orgName}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'notion') {
      const result = await completeNotionOAuth(code);
      await persistIntegration({
        environmentId,
        provider: 'notion',
        accountLabel: result.workspace_id,
        displayName: `Notion · ${result.workspace_name ?? result.workspace_id}`,
        credentialsObject: { accessToken: result.access_token, botId: result.bot_id },
        refreshToken: null,
        expiresAt: null,
        scopes: def.scopes,
        previewSource: result.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'figma') {
      const tokens = await exchangeCodeForTokens(FIGMA_PROVIDER, code);
      const user = await getFigmaUser(tokens.access_token);
      await persistIntegration({
        environmentId,
        provider: 'figma',
        accountLabel: user.handle,
        displayName: `Figma · ${user.handle}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'microsoft_outlook') {
      const tokens = await exchangeCodeForTokens(MICROSOFT_OUTLOOK_PROVIDER, code);
      const user = await getMicrosoftUser(tokens.access_token);
      const email = user.mail || user.userPrincipalName;
      await persistIntegration({
        environmentId,
        provider: 'microsoft_outlook',
        accountLabel: email,
        displayName: `Outlook · ${user.displayName || email}`,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    // ── New dedicated providers ─────────────────────────────────

    if (provider === 'shopify') {
      const shop = cookieExtra;
      if (!shop) return redirectBack(environmentId, 'error', 'Shop domain missing from state');
      const tokens = await completeShopifyOAuth(shop, code);
      let shopName = shop;
      try {
        const info = await getShopInfo(shop, tokens.access_token);
        shopName = info.name || info.domain || shop;
      } catch { /* fall through */ }
      await persistIntegration({
        environmentId,
        provider: 'shopify',
        accountLabel: shop,
        displayName: `Shopify · ${shopName}`,
        credentialsObject: { accessToken: tokens.access_token, shop },
        refreshToken: null,
        expiresAt: null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'mailchimp') {
      const { tokens, metadata } = await completeMailchimpOAuth(code);
      await persistIntegration({
        environmentId,
        provider: 'mailchimp',
        accountLabel: metadata.accountname || metadata.dc,
        displayName: `Mailchimp · ${metadata.accountname || metadata.dc}`,
        credentialsObject: {
          accessToken: tokens.access_token,
          dc: metadata.dc,
          apiEndpoint: metadata.api_endpoint,
        },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'airtable') {
      const codeVerifier = cookieExtra;
      if (!codeVerifier) return redirectBack(environmentId, 'error', 'PKCE code_verifier missing from state');
      const tokens = await exchangeAirtableCode(code, codeVerifier);
      let accountLabel = 'default';
      let displayName = 'Airtable';
      try {
        const user = await getAirtableUser(tokens.access_token);
        accountLabel = user.email || user.id;
        displayName = `Airtable · ${user.email || user.id}`;
      } catch { /* fall through */ }
      await persistIntegration({
        environmentId,
        provider: 'airtable',
        accountLabel,
        displayName,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'typeform') {
      const tokens = await exchangeCodeForTokens(TYPEFORM_PROVIDER, code);
      let accountLabel = 'default';
      let displayName = 'Typeform';
      try {
        const user = await getTypeformUser(tokens.access_token);
        accountLabel = user.email || user.alias || user.user_id;
        displayName = `Typeform · ${user.alias || user.email}`;
      } catch { /* fall through */ }
      await persistIntegration({
        environmentId,
        provider: 'typeform',
        accountLabel,
        displayName,
        credentialsObject: { accessToken: tokens.access_token },
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: def.scopes,
        previewSource: tokens.access_token,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    // ── Generic providers with profile fetchers ──────────────────

    // Atlassian (Jira + Confluence) — fetch accessible resources
    if (provider === 'jira' || provider === 'confluence') {
      const prov = provider === 'jira' ? JIRA_PROVIDER : CONFLUENCE_PROVIDER;
      await handleGenericOAuthCallback({
        provider: prov, providerId: provider, providerName: def.name, code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
            headers: { Authorization: `Bearer ${at}`, Accept: 'application/json' },
          });
          if (res.ok) {
            const sites = (await res.json()) as { id: string; name: string; url: string }[];
            if (sites.length > 0) {
              return { accountLabel: sites[0].id, displayName: `${def.name} · ${sites[0].name}` };
            }
          }
          return { accountLabel: 'default', displayName: def.name };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'asana') {
      await handleGenericOAuthCallback({
        provider: ASANA_PROVIDER, providerId: 'asana', providerName: 'Asana', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://app.asana.com/api/1.0/users/me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { data: { gid: string; name: string; email: string } };
            return { accountLabel: data.data.email || data.data.gid, displayName: `Asana · ${data.data.name}` };
          }
          return { accountLabel: 'default', displayName: 'Asana' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'discord') {
      await handleGenericOAuthCallback({
        provider: DISCORD_PROVIDER, providerId: 'discord', providerName: 'Discord', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string; username: string; global_name?: string };
            return { accountLabel: data.id, displayName: `Discord · ${data.global_name || data.username}` };
          }
          return { accountLabel: 'default', displayName: 'Discord' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'zoom') {
      await handleGenericOAuthCallback({
        provider: ZOOM_PROVIDER, providerId: 'zoom', providerName: 'Zoom', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.zoom.us/v2/users/me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string; email: string; first_name: string; last_name: string };
            return { accountLabel: data.email, displayName: `Zoom · ${data.first_name} ${data.last_name}` };
          }
          return { accountLabel: 'default', displayName: 'Zoom' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'microsoft_teams') {
      await handleGenericOAuthCallback({
        provider: MICROSOFT_TEAMS_PROVIDER, providerId: 'microsoft_teams', providerName: 'Microsoft Teams', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string; displayName: string; mail?: string; userPrincipalName: string };
            return { accountLabel: data.mail || data.userPrincipalName, displayName: `Teams · ${data.displayName}` };
          }
          return { accountLabel: 'default', displayName: 'Microsoft Teams' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'linkedin' || provider === 'linkedin_ads') {
      const prov = provider === 'linkedin' ? LINKEDIN_PROVIDER : LINKEDIN_ADS_PROVIDER;
      await handleGenericOAuthCallback({
        provider: prov, providerId: provider, providerName: def.name, code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { sub: string; name: string; email?: string };
            return { accountLabel: data.email || data.sub, displayName: `${def.name} · ${data.name}` };
          }
          return { accountLabel: 'default', displayName: def.name };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'twitter') {
      await handleGenericOAuthCallback({
        provider: TWITTER_PROVIDER, providerId: 'twitter', providerName: 'X (Twitter)', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { data: { id: string; username: string; name: string } };
            return { accountLabel: data.data.username, displayName: `X · @${data.data.username}` };
          }
          return { accountLabel: 'default', displayName: 'X (Twitter)' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'gitlab') {
      await handleGenericOAuthCallback({
        provider: GITLAB_PROVIDER, providerId: 'gitlab', providerName: 'GitLab', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://gitlab.com/api/v4/user', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { id: number; username: string; name: string };
            return { accountLabel: data.username, displayName: `GitLab · ${data.username}` };
          }
          return { accountLabel: 'default', displayName: 'GitLab' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'bitbucket') {
      await handleGenericOAuthCallback({
        provider: BITBUCKET_PROVIDER, providerId: 'bitbucket', providerName: 'Bitbucket', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.bitbucket.org/2.0/user', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { uuid: string; username?: string; display_name: string };
            return { accountLabel: data.username || data.uuid, displayName: `Bitbucket · ${data.display_name}` };
          }
          return { accountLabel: 'default', displayName: 'Bitbucket' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    if (provider === 'dropbox') {
      await handleGenericOAuthCallback({
        provider: DROPBOX_PROVIDER, providerId: 'dropbox', providerName: 'Dropbox', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
            method: 'POST',
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { account_id: string; email: string; name: { display_name: string } };
            return { accountLabel: data.email, displayName: `Dropbox · ${data.name.display_name}` };
          }
          return { accountLabel: 'default', displayName: 'Dropbox' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    // Google-OAuth providers that reuse GOOGLE_CLIENT_ID
    if (provider === 'google_drive' || provider === 'youtube') {
      const prov = provider === 'google_drive' ? GOOGLE_DRIVE_PROVIDER : YOUTUBE_PROVIDER;
      await handleGenericOAuthCallback({
        provider: prov, providerId: provider, providerName: def.name, code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { email: string; name?: string };
            return { accountLabel: data.email, displayName: `${def.name} · ${data.email}` };
          }
          return { accountLabel: 'default', displayName: def.name };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    // Microsoft-OAuth providers that reuse MICROSOFT_CLIENT_ID
    if (provider === 'onedrive') {
      await handleGenericOAuthCallback({
        provider: ONEDRIVE_PROVIDER, providerId: 'onedrive', providerName: 'OneDrive', code,
        environmentId, scopes: def.scopes, createdById: identity.id,
        fetchProfile: async (at) => {
          const res = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${at}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { displayName: string; mail?: string; userPrincipalName: string };
            return { accountLabel: data.mail || data.userPrincipalName, displayName: `OneDrive · ${data.displayName}` };
          }
          return { accountLabel: 'default', displayName: 'OneDrive' };
        },
      });
      return redirectBack(environmentId, 'success');
    }

    // ── Generic providers without dedicated profile fetchers ─────
    // For these, we persist with token only. Profile can be fetched later.

    const genericProviderMap: Record<string, import('@/lib/integrations/oauth/base').OAuthProvider> = {
      trello: TRELLO_PROVIDER,
      monday: MONDAY_PROVIDER,
      clickup: CLICKUP_PROVIDER,
      basecamp: BASECAMP_PROVIDER,
      wrike: WRIKE_PROVIDER,
      todoist: TODOIST_PROVIDER,
      calendly: CALENDLY_PROVIDER,
      pipedrive: PIPEDRIVE_PROVIDER,
      zoho_crm: ZOHO_CRM_PROVIDER,
      square: SQUARE_PROVIDER,
      gumroad: GUMROAD_PROVIDER,
      instagram: INSTAGRAM_PROVIDER,
      tiktok: TIKTOK_PROVIDER,
      buffer: BUFFER_PROVIDER,
      tiktok_ads: TIKTOK_ADS_PROVIDER,
      canva: CANVA_PROVIDER,
      miro: MIRO_PROVIDER,
      adobe_creative_cloud: ADOBE_CREATIVE_CLOUD_PROVIDER,
      sketch: SKETCH_PROVIDER,
      box: BOX_PROVIDER,
      surveymonkey: SURVEYMONKEY_PROVIDER,
      zendesk: ZENDESK_PROVIDER,
      intercom: INTERCOM_PROVIDER,
      helpscout: HELPSCOUT_PROVIDER,
      quickbooks: QUICKBOOKS_PROVIDER,
      xero: XERO_PROVIDER,
      freshbooks: FRESHBOOKS_PROVIDER,
      wave: WAVE_PROVIDER,
      gusto: GUSTO_PROVIDER,
      rippling: RIPPLING_PROVIDER,
      loom: LOOM_PROVIDER,
      vimeo: VIMEO_PROVIDER,
      vercel: VERCEL_PROVIDER,
      sentry: SENTRY_PROVIDER,
      netlify: NETLIFY_PROVIDER,
    };

    const genericProv = genericProviderMap[provider];
    if (genericProv) {
      await handleGenericOAuthCallback({
        provider: genericProv,
        providerId: provider,
        providerName: def.name,
        code,
        environmentId,
        scopes: def.scopes,
        createdById: identity.id,
      });
      return redirectBack(environmentId, 'success');
    }

    return redirectBack(environmentId, 'error', `No callback handler for ${provider}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth exchange failed';
    return redirectBack(environmentId, 'error', message);
  }
}
