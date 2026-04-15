/**
 * Google Analytics (GA4) read client. Uses the Data API v1beta.
 * accountLabel stores the GA4 property id (e.g. "properties/123456789").
 */

import { loadGoogleIntegration, getGoogleAccessToken, googleAuthHeaders } from './google-shared';
import { GOOGLE_ANALYTICS_PROVIDER } from '../oauth/google';

const API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

type DatePreset = 'yesterday' | 'last7Days' | 'last30Days';
const PRESET_RANGE: Record<DatePreset, { startDate: string; endDate: string }> = {
  yesterday: { startDate: 'yesterday', endDate: 'yesterday' },
  last7Days: { startDate: '7daysAgo', endDate: 'today' },
  last30Days: { startDate: '30daysAgo', endDate: 'today' },
};

export async function getGoogleAnalyticsClient(integrationId: string, environmentId: string) {
  const integration = await loadGoogleIntegration(integrationId, environmentId, 'google_analytics');
  const propertyPath = integration.accountLabel ?? '';
  if (!propertyPath.startsWith('properties/')) {
    throw new Error('GA4 property id missing or malformed on integration');
  }

  async function runReport<T>(body: unknown): Promise<T> {
    const accessToken = await getGoogleAccessToken(integration, GOOGLE_ANALYTICS_PROVIDER);
    const res = await fetch(`${API_BASE}/${propertyPath}:runReport`, {
      method: 'POST',
      headers: { ...googleAuthHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GA4 runReport failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Site-wide traffic totals (users, sessions, pageviews, engagement). */
    async getTrafficTotals(preset: DatePreset = 'last7Days') {
      const range = PRESET_RANGE[preset];
      const data = await runReport<{ rows?: { metricValues: { value: string }[] }[] }>({
        dateRanges: [range],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
      });
      const vals = data.rows?.[0]?.metricValues.map(v => Number(v.value)) ?? [0, 0, 0, 0, 0];
      return {
        preset,
        activeUsers: vals[0],
        sessions: vals[1],
        pageviews: vals[2],
        avgSessionDurationSec: vals[3],
        bounceRate: vals[4],
      };
    },

    /** Top pages by pageviews. */
    async getTopPages(preset: DatePreset = 'last7Days', limit = 10) {
      const range = PRESET_RANGE[preset];
      const data = await runReport<{
        rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
      }>({
        dateRanges: [range],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: String(limit),
      });
      return (data.rows ?? []).map(row => ({
        path: row.dimensionValues[0]?.value ?? '',
        pageviews: Number(row.metricValues[0]?.value ?? 0),
        users: Number(row.metricValues[1]?.value ?? 0),
      }));
    },
  };
}
