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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
  const [storedState, environmentId] = cookieVal.split('.');
  if (storedState !== returnedState) {
    return redirectBack(null, 'error', 'State mismatch — possible CSRF, aborting');
  }
  cookieStore.delete(cookieName);

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return redirectBack(null, 'error', 'Environment not found or access revoked');

  try {
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

      // Fetch the user's email so we have a default accountLabel +
      // displayName. Each surface may override the accountLabel with
      // its own identifier below.
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = (await userInfoRes.json()) as { email: string; name?: string };

      let accountLabel = userInfo.email;
      let displayName = `${def.name} · ${userInfo.email}`;

      if (provider === 'google_ads') {
        // Look up the user's accessible customer ids.
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
        // Fetch the first GA4 property.
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
        // Fetch the first verified site.
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
        // Fetch the user's primary calendar for a friendlier label.
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
      // Salesforce org id comes from the "id" URL: /id/<orgId>/<userId>.
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
      // Fetch viewer to stamp accountLabel.
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

    return redirectBack(environmentId, 'error', `No callback handler for ${provider}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth exchange failed';
    return redirectBack(environmentId, 'error', message);
  }
}
