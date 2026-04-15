/**
 * Google Ads read client. Uses Google Ads REST API v16 via GoogleAds
 * query language (GAQL). Each call requires a developer token header
 * in addition to the OAuth bearer, and a customer id (account id).
 *
 * accountLabel on the Integration row stores the Google Ads customer
 * id (e.g. "1234567890"). If the user has MCC access they may manage
 * many customers — the initial connect picks the first login customer
 * and multi-account selection is a Phase 5 concern.
 */

import { loadGoogleIntegration, getGoogleAccessToken, googleAuthHeaders } from './google-shared';
import { GOOGLE_ADS_PROVIDER } from '../oauth/google';

const API_BASE = 'https://googleads.googleapis.com/v16';

export async function getGoogleAdsClient(integrationId: string, environmentId: string) {
  const integration = await loadGoogleIntegration(integrationId, environmentId, 'google_ads');
  const customerId = (integration.accountLabel ?? '').replace(/-/g, '');
  if (!customerId) throw new Error('Google Ads customer id missing on integration');

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN env var is not set');

  async function gaqlQuery<T>(query: string): Promise<T[]> {
    const accessToken = await getGoogleAccessToken(integration, GOOGLE_ADS_PROVIDER);
    const res = await fetch(`${API_BASE}/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        ...googleAuthHeaders(accessToken),
        'developer-token': developerToken!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Ads query failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const payload = (await res.json()) as Array<{ results?: T[] }>;
    return payload.flatMap(chunk => chunk.results ?? []);
  }

  return {
    integration,

    /** Account-level totals for a date range. */
    async getAccountTotals(datePreset: 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' = 'LAST_7_DAYS') {
      const rows = await gaqlQuery<{
        metrics: { costMicros: string; impressions: string; clicks: string; conversions: string };
      }>(`
        SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
        FROM customer
        WHERE segments.date DURING ${datePreset}
      `);
      const totals = rows.reduce(
        (acc, r) => ({
          cost: acc.cost + Number(r.metrics.costMicros) / 1_000_000,
          impressions: acc.impressions + Number(r.metrics.impressions),
          clicks: acc.clicks + Number(r.metrics.clicks),
          conversions: acc.conversions + Number(r.metrics.conversions),
        }),
        { cost: 0, impressions: 0, clicks: 0, conversions: 0 },
      );
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
      return { datePreset, ...totals, ctr, cpc };
    },

    /** Per-campaign performance for a date range. */
    async getCampaignBreakdown(
      datePreset: 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' = 'LAST_7_DAYS',
      limit = 25,
    ) {
      const rows = await gaqlQuery<{
        campaign: { id: string; name: string; status: string };
        metrics: { costMicros: string; impressions: string; clicks: string; conversions: string };
      }>(`
        SELECT campaign.id, campaign.name, campaign.status,
               metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
        FROM campaign
        WHERE segments.date DURING ${datePreset}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `);
      return rows.map(r => ({
        campaignId: r.campaign.id,
        name: r.campaign.name,
        status: r.campaign.status,
        cost: Number(r.metrics.costMicros) / 1_000_000,
        impressions: Number(r.metrics.impressions),
        clicks: Number(r.metrics.clicks),
        conversions: Number(r.metrics.conversions),
      }));
    },
  };
}
