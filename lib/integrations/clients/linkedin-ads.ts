/**
 * LinkedIn Ads read client. Uses the LinkedIn Marketing API v2 with
 * OAuth2 bearer token auth for ad accounts and campaign analytics.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type LinkedInAdsCreds = { accessToken: string };

const API_BASE = 'https://api.linkedin.com/v2';

export async function getLinkedInAdsClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'linkedin_ads', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('LinkedIn Ads integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as LinkedInAdsCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LinkedIn Ads ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List ad accounts the authenticated user has access to. */
    async listAdAccounts() {
      const data = await get<{
        elements: {
          id: number;
          name: string;
          currency: string;
          status: string;
          type: string;
          reference: string;
          notifiedOnNewFeaturesEnabled: boolean;
        }[];
      }>('/adAccountsV2?q=search&sort.field=NAME&sort.order=ASCENDING');
      return data.elements.map(a => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        status: a.status,
        type: a.type,
      }));
    },

    /** Get campaign analytics for an ad account. */
    async getCampaignAnalytics(accountId: string) {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 86_400_000);
      const dateRange = `dateRange=(start:(year:${startDate.getFullYear()},month:${startDate.getMonth() + 1},day:${startDate.getDate()}),end:(year:${endDate.getFullYear()},month:${endDate.getMonth() + 1},day:${endDate.getDate()}))`;

      const data = await get<{
        elements: {
          pivotValues: string[];
          impressions: number;
          clicks: number;
          costInLocalCurrency: string;
          externalWebsiteConversions: number;
          dateRange: { start: { year: number; month: number; day: number } };
        }[];
      }>(`/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&${dateRange}&accounts=urn:li:sponsoredAccount:${accountId}&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions`);
      return data.elements.map(e => ({
        campaignUrn: e.pivotValues[0] ?? null,
        impressions: e.impressions,
        clicks: e.clicks,
        cost: parseFloat(e.costInLocalCurrency),
        conversions: e.externalWebsiteConversions,
      }));
    },
  };
}
