/**
 * Meta Ads read client. Loads the Integration row, decrypts the
 * long-lived access token, and exposes a small set of read calls
 * agents can invoke as tools.
 *
 * Uses Graph API v20.0 — bump META_GRAPH_VERSION in oauth/meta.ts
 * when Meta deprecates a version. The insights endpoint is the main
 * workhorse: it powers the Daily Paid Ads Review blueprint's real
 * spend/ROAS/CTR numbers.
 *
 * All write operations (pause campaign, update budget) are behind
 * the explicit-permission layer which is Phase 5, not Phase 2.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';
import { META_GRAPH_VERSION } from '../oauth/meta';

type MetaCreds = { accessToken: string };

const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export type MetaInsightsRow = {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr?: string;
  cpc?: string;
  actions?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
};

export async function getMetaAdsClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      environmentId,
      provider: 'meta_ads',
      deletedAt: null,
      status: 'ACTIVE',
    },
  });
  if (!integration) throw new Error('Meta Ads integration not found or not active');
  if (!integration.accountLabel) throw new Error('Meta Ads integration missing ad account id');

  let creds: MetaCreds;
  try {
    creds = JSON.parse(decryptString(integration.credentialsEnc)) as MetaCreds;
  } catch {
    throw new Error('Failed to decrypt Meta Ads credentials — token may need reconnecting');
  }

  const accessToken = creds.accessToken;
  // accountLabel stores the "act_1234567890" form Meta expects as a node id
  const adAccountId = integration.accountLabel.startsWith('act_')
    ? integration.accountLabel
    : `act_${integration.accountLabel}`;

  return {
    integration,

    /** Account summary — name, currency, status. */
    async getAccountSummary(): Promise<{ id: string; name: string; currency: string; status: number }> {
      const url = new URL(`${GRAPH_BASE}/${adAccountId}`);
      url.searchParams.set('fields', 'id,name,currency,account_status');
      // Use Authorization header instead of URL param to prevent token leaking in logs
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Meta account summary failed: ${await res.text()}`);
      const d = (await res.json()) as { id: string; name: string; currency: string; account_status: number };
      return { id: d.id, name: d.name, currency: d.currency, status: d.account_status };
    },

    /**
     * Fetch campaign-level insights for a date range. `datePreset`
     * accepts Meta's canonical strings: "yesterday", "last_7d",
     * "last_30d", "maximum". For custom ranges pass `{since,until}`
     * instead.
     */
    async getCampaignInsights(args: {
      datePreset?: 'yesterday' | 'last_7d' | 'last_30d' | 'maximum';
      since?: string;
      until?: string;
      limit?: number;
    }): Promise<(MetaInsightsRow & { campaign_id: string; campaign_name: string })[]> {
      const url = new URL(`${GRAPH_BASE}/${adAccountId}/insights`);
      url.searchParams.set(
        'fields',
        'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,purchase_roas',
      );
      url.searchParams.set('level', 'campaign');
      url.searchParams.set('limit', String(args.limit ?? 25));
      if (args.since && args.until) {
        url.searchParams.set('time_range', JSON.stringify({ since: args.since, until: args.until }));
      } else {
        url.searchParams.set('date_preset', args.datePreset ?? 'yesterday');
      }
      // Use Authorization header instead of URL param to prevent token leaking in logs
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Meta insights failed: ${await res.text()}`);
      const payload = (await res.json()) as {
        data: (MetaInsightsRow & { campaign_id: string; campaign_name: string })[];
      };
      return payload.data;
    },

    /**
     * Create a PAUSED draft campaign on the ad account. WRITE — the
     * campaign is NEVER started by this call. The user reviews in
     * Meta's UI and flips status to ACTIVE themselves, which is when
     * Meta starts charging. No targeting or creatives are set here;
     * those are resource-dependent follow-ups the user does manually
     * (or through a phase 5 expansion of this executor).
     *
     * Objective defaults to OUTCOME_TRAFFIC because it is the safest
     * broad objective when the project goal hasn't specified one.
     * Meta's objective taxonomy as of v20:
     *   OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT,
     *   OUTCOME_LEADS, OUTCOME_APP_PROMOTION, OUTCOME_SALES.
     */
    async createDraftCampaign(args: {
      name: string;
      objective?: string;
      specialAdCategories?: string[];
    }): Promise<{ id: string; manageUrl: string }> {
      const url = `${GRAPH_BASE}/${adAccountId}/campaigns`;
      const body = new URLSearchParams({
        name: args.name.slice(0, 100),
        objective: args.objective ?? 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: JSON.stringify(args.specialAdCategories ?? []),
      });
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Meta createDraftCampaign failed (${res.status}): ${text.slice(0, 300)}`);
      }
      const data = (await res.json()) as { id: string };
      const manageUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace('act_', '')}&selected_campaign_ids=${data.id}`;
      return { id: data.id, manageUrl };
    },

    /**
     * Aggregate totals across the whole account for the same range.
     * This is the hot path for the Daily Paid Ads Review agent — one
     * call populates the Spend / ROAS / CTR metric blocks.
     */
    async getAccountTotals(args: { datePreset?: 'yesterday' | 'last_7d' | 'last_30d' }): Promise<{
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      roas: number | null;
    }> {
      const url = new URL(`${GRAPH_BASE}/${adAccountId}/insights`);
      url.searchParams.set('fields', 'spend,impressions,clicks,ctr,purchase_roas');
      url.searchParams.set('date_preset', args.datePreset ?? 'yesterday');
      // Use Authorization header instead of URL param to prevent token leaking in logs
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Meta account totals failed: ${await res.text()}`);
      const payload = (await res.json()) as { data: MetaInsightsRow[] };
      const row = payload.data[0];
      if (!row) return { spend: 0, impressions: 0, clicks: 0, ctr: 0, roas: null };
      const roasVal = row.purchase_roas?.[0]?.value;
      return {
        spend: Number(row.spend ?? 0),
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        ctr: Number(row.ctr ?? 0),
        roas: roasVal ? Number(roasVal) : null,
      };
    },
  };
}
