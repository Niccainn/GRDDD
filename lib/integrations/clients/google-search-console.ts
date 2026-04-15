/**
 * Google Search Console read client. Uses the Search Analytics API.
 * accountLabel stores the verified site URL (e.g. "https://example.com/"
 * or "sc-domain:example.com").
 */

import { loadGoogleIntegration, getGoogleAccessToken, googleAuthHeaders } from './google-shared';
import { GOOGLE_SEARCH_CONSOLE_PROVIDER } from '../oauth/google';

const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';

type DatePreset = 'last7Days' | 'last28Days';
function rangeForPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (preset === 'last7Days' ? 7 : 28));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export async function getGoogleSearchConsoleClient(integrationId: string, environmentId: string) {
  const integration = await loadGoogleIntegration(integrationId, environmentId, 'google_search_console');
  const siteUrl = integration.accountLabel ?? '';
  if (!siteUrl) throw new Error('Search Console siteUrl missing on integration');

  async function searchAnalytics<T>(body: unknown): Promise<T> {
    const accessToken = await getGoogleAccessToken(integration, GOOGLE_SEARCH_CONSOLE_PROVIDER);
    const res = await fetch(
      `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { ...googleAuthHeaders(accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Search Console query failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Site-wide clicks/impressions/CTR/position for a date range. */
    async getTotals(preset: DatePreset = 'last7Days') {
      const data = await searchAnalytics<{
        rows?: { clicks: number; impressions: number; ctr: number; position: number }[];
      }>({ ...rangeForPreset(preset), dimensions: [] });
      const row = data.rows?.[0];
      return {
        preset,
        clicks: row?.clicks ?? 0,
        impressions: row?.impressions ?? 0,
        ctr: row?.ctr ?? 0,
        position: row?.position ?? 0,
      };
    },

    /** Top queries by click volume. */
    async getTopQueries(preset: DatePreset = 'last7Days', limit = 20) {
      const data = await searchAnalytics<{
        rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
      }>({
        ...rangeForPreset(preset),
        dimensions: ['query'],
        rowLimit: limit,
      });
      return (data.rows ?? []).map(r => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));
    },
  };
}
