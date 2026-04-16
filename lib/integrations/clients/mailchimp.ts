/**
 * Mailchimp read client. Uses the Marketing API v3.0 for list info,
 * campaign history, and campaign reports. The datacenter is extracted
 * from the API key suffix (e.g. "…-us14" -> "us14").
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type MailchimpCreds = { apiKey: string };

export async function getMailchimpClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'mailchimp', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Mailchimp integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MailchimpCreds;
  const dc = creds.apiKey.split('-').pop() ?? 'us1';
  const apiBase = `https://${dc}.api.mailchimp.com/3.0`;
  const headers = {
    Authorization: `Basic ${btoa(`anystring:${creds.apiKey}`)}`,
    Accept: 'application/json',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mailchimp ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Get info about a specific audience/list. */
    async getListInfo(listId: string) {
      const data = await get<{
        id: string;
        name: string;
        stats: { member_count: number; unsubscribe_count: number; open_rate: number; click_rate: number };
      }>(`/lists/${listId}`);
      return {
        id: data.id,
        name: data.name,
        memberCount: data.stats.member_count,
        unsubscribeCount: data.stats.unsubscribe_count,
        openRate: data.stats.open_rate,
        clickRate: data.stats.click_rate,
      };
    },

    /** Get recent campaigns. */
    async getRecentCampaigns(limit = 10) {
      const data = await get<{
        campaigns: {
          id: string;
          type: string;
          status: string;
          send_time: string | null;
          settings: { subject_line: string; title: string };
          emails_sent: number;
        }[];
      }>(`/campaigns?count=${limit}&sort_field=send_time&sort_dir=DESC`);
      return data.campaigns.map(c => ({
        id: c.id,
        type: c.type,
        status: c.status,
        sentAt: c.send_time,
        subjectLine: c.settings.subject_line,
        title: c.settings.title,
        emailsSent: c.emails_sent,
      }));
    },

    /** Get performance report for a specific campaign. */
    async getCampaignReport(campaignId: string) {
      const data = await get<{
        id: string;
        emails_sent: number;
        opens: { opens_total: number; unique_opens: number; open_rate: number };
        clicks: { clicks_total: number; unique_clicks: number; click_rate: number };
        unsubscribed: number;
        bounce_summary: { hard_bounces: number; soft_bounces: number };
      }>(`/reports/${campaignId}`);
      return {
        id: data.id,
        emailsSent: data.emails_sent,
        opensTotal: data.opens.opens_total,
        uniqueOpens: data.opens.unique_opens,
        openRate: data.opens.open_rate,
        clicksTotal: data.clicks.clicks_total,
        uniqueClicks: data.clicks.unique_clicks,
        clickRate: data.clicks.click_rate,
        unsubscribed: data.unsubscribed,
        hardBounces: data.bounce_summary.hard_bounces,
        softBounces: data.bounce_summary.soft_bounces,
      };
    },
  };
}
