/**
 * POST /api/integrations/[id]/test
 *
 * Pings the remote provider with the stored credentials to confirm
 * the integration is still alive. This is:
 *   - the "Test connection" button in the integrations page UI,
 *   - the health-check the dashboard calls before refreshing widgets,
 *   - the way we bump `status` from ERROR back to ACTIVE after a user
 *     rotates their token upstream.
 *
 * We do NOT expose the response body of the remote call — only a
 * sanitized summary — so a misbehaving provider can't leak random
 * data through this endpoint.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';
import { getReadableEnvironment } from '@/lib/integrations/access';
import { testCloudflareConnection } from '@/lib/integrations/apikey/cloudflare';
import { testStripeKey } from '@/lib/integrations/apikey/stripe';
import { testShopifyCredentials } from '@/lib/integrations/apikey/shopify';
import { testMetaToken } from '@/lib/integrations/oauth/meta';
import { testGoogleToken } from '@/lib/integrations/oauth/google';
import { testSalesforceToken } from '@/lib/integrations/oauth/salesforce';
import { testHubSpotToken } from '@/lib/integrations/oauth/hubspot';
import { testSlackToken } from '@/lib/integrations/oauth/slack';
import { testGitHubToken } from '@/lib/integrations/oauth/github';
import { testLinearToken } from '@/lib/integrations/oauth/linear';
import { testNotionToken } from '@/lib/integrations/oauth/notion';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const integration = await prisma.integration.findFirst({
    where: { id, deletedAt: null },
  });
  if (!integration) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await getReadableEnvironment(integration.environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  let creds: Record<string, string>;
  try {
    creds = JSON.parse(decryptString(integration.credentialsEnc)) as Record<string, string>;
  } catch {
    return Response.json(
      { ok: false, error: 'Could not decrypt stored credentials' },
      { status: 500 },
    );
  }

  try {
    let summary: Record<string, unknown>;
    if (integration.provider === 'cloudflare') {
      const r = await testCloudflareConnection(creds.apiToken);
      summary = {
        tokenStatus: r.tokenStatus,
        accountCount: r.accountCount,
        firstAccount: r.firstAccount?.name,
      };
    } else if (integration.provider === 'meta_ads') {
      const r = await testMetaToken(creds.accessToken);
      summary = { userId: r.id, userName: r.name };
    } else if (
      integration.provider === 'google_ads' ||
      integration.provider === 'google_analytics' ||
      integration.provider === 'google_search_console' ||
      integration.provider === 'google_workspace'
    ) {
      const r = await testGoogleToken(creds.accessToken);
      summary = { email: r.email };
    } else if (integration.provider === 'salesforce') {
      const r = await testSalesforceToken(creds.accessToken, creds.instanceUrl);
      summary = { instanceUrl: r.instanceUrl };
    } else if (integration.provider === 'hubspot') {
      const r = await testHubSpotToken(creds.accessToken);
      summary = { portalId: r.portalId, uiDomain: r.uiDomain };
    } else if (integration.provider === 'slack') {
      const r = await testSlackToken(creds.accessToken);
      summary = { team: r.team, user: r.user };
    } else if (integration.provider === 'github') {
      const r = await testGitHubToken(creds.accessToken);
      summary = { login: r.login, userId: r.userId };
    } else if (integration.provider === 'linear') {
      const r = await testLinearToken(creds.accessToken);
      summary = { name: r.name, email: r.email };
    } else if (integration.provider === 'notion') {
      const r = await testNotionToken(creds.accessToken);
      summary = { workspace: r.workspace };
    } else if (integration.provider === 'stripe') {
      const r = await testStripeKey(creds.secretKey);
      summary = { accountId: r.accountId, businessName: r.businessName, country: r.country };
    } else if (integration.provider === 'shopify') {
      const r = await testShopifyCredentials(creds.shopDomain, creds.accessToken);
      summary = { shopName: r.shopName, shopId: r.shopId, currency: r.currency };
    } else {
      return Response.json(
        { ok: false, error: `No test handler for provider ${integration.provider}` },
        { status: 400 },
      );
    }

    await prisma.integration.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        lastSyncedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });

    return Response.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.integration.update({
      where: { id },
      data: {
        status: 'ERROR',
        lastError: message.slice(0, 500),
        lastErrorAt: new Date(),
      },
    });
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
