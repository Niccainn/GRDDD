/**
 * TikTok Ads read client. Uses the TikTok Business API v1.3 with
 * Access-Token header auth for campaigns and ad group insights.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TikTokAdsCreds = { accessToken: string; advertiserId: string };

const API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

export async function getTikTokAdsClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'tiktok_ads', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('TikTok Ads integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TikTokAdsCreds;
  const headers = { 'Access-Token': creds.accessToken, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TikTok Ads ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { code: number; message: string; data: T };
    if (json.code !== 0) throw new Error(`TikTok Ads ${path} error: ${json.message}`);
    return json.data;
  }

  return {
    integration,

    /** Get campaigns for the advertiser. */
    async getCampaigns(limit = 20) {
      const data = await get<{
        list: {
          campaign_id: string;
          campaign_name: string;
          objective_type: string;
          budget: number;
          budget_mode: string;
          status: string;
          create_time: string;
        }[];
        page_info: { total_number: number };
      }>(`/campaign/get/?advertiser_id=${creds.advertiserId}&page_size=${limit}`);
      return {
        campaigns: data.list.map(c => ({
          id: c.campaign_id,
          name: c.campaign_name,
          objective: c.objective_type,
          budget: c.budget,
          budgetMode: c.budget_mode,
          status: c.status,
          createdAt: c.create_time,
        })),
        total: data.page_info.total_number,
      };
    },

    /** Get ad group insights for a campaign. */
    async getAdGroupInsights(campaignId: string) {
      const data = await get<{
        list: {
          adgroup_id: string;
          adgroup_name: string;
          spend: string;
          impressions: string;
          clicks: string;
          conversions: string;
          cpc: string;
          cpm: string;
          ctr: string;
        }[];
      }>(`/adgroup/get/?advertiser_id=${creds.advertiserId}&filtering={"campaign_ids":["${campaignId}"]}`);
      return data.list.map(a => ({
        id: a.adgroup_id,
        name: a.adgroup_name,
        spend: parseFloat(a.spend),
        impressions: parseInt(a.impressions, 10),
        clicks: parseInt(a.clicks, 10),
        conversions: parseInt(a.conversions, 10),
        cpc: parseFloat(a.cpc),
        cpm: parseFloat(a.cpm),
        ctr: parseFloat(a.ctr),
      }));
    },
  };
}
