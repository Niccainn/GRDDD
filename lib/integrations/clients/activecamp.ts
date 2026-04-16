/**
 * ActiveCampaign read client. Uses the ActiveCampaign v3 API with
 * Api-Token header authentication for contacts, deals, and automations.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ActiveCampaignCreds = { apiUrl: string; apiToken: string };

export async function getActiveCampaignClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'activecampaign', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('ActiveCampaign integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ActiveCampaignCreds;
  // apiUrl is like https://{account}.api-us1.com
  const apiBase = `${creds.apiUrl.replace(/\/+$/, '')}/api/3`;
  const headers = { 'Api-Token': creds.apiToken, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ActiveCampaign ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List contacts with optional limit. */
    async listContacts(limit = 20) {
      const data = await get<{
        contacts: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          cdate: string;
        }[];
        meta: { total: string };
      }>(`/contacts?limit=${limit}&orders[cdate]=DESC`);
      return {
        contacts: data.contacts.map(c => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          createdAt: c.cdate,
        })),
        total: parseInt(data.meta.total, 10),
      };
    },

    /** List deals with optional limit. */
    async listDeals(limit = 20) {
      const data = await get<{
        deals: {
          id: string;
          title: string;
          value: string;
          currency: string;
          stage: string;
          status: number;
          cdate: string;
        }[];
        meta: { total: string };
      }>(`/deals?limit=${limit}&orders[cdate]=DESC`);
      return {
        deals: data.deals.map(d => ({
          id: d.id,
          title: d.title,
          value: parseFloat(d.value),
          currency: d.currency,
          stage: d.stage,
          status: d.status,
          createdAt: d.cdate,
        })),
        total: parseInt(data.meta.total, 10),
      };
    },

    /** List automations. */
    async listAutomations() {
      const data = await get<{
        automations: {
          id: string;
          name: string;
          status: string;
          entered: string;
          cdate: string;
        }[];
      }>('/automations?limit=100');
      return data.automations.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        entered: parseInt(a.entered, 10),
        createdAt: a.cdate,
      }));
    },
  };
}
