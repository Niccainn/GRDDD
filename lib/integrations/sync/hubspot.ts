/**
 * HubSpot sync fetcher.
 *
 * Pulls deals and contacts modified since `since`. Deals drive
 * "something changed on a revenue opportunity" signals; contacts
 * capture new inbound leads. Both kept under 50 per tick so a long
 * absence doesn't dump hundreds at once.
 */

import { safeFetch } from '../clients/fetch-safe';
import type { Credentials, SyncItem } from './dispatcher';

type HubSpotSearchResponse<T> = {
  total: number;
  results: T[];
};

type HubSpotDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    hs_lastmodifieddate?: string;
    closedate?: string;
  };
};

type HubSpotContact = {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    company?: string;
    lastmodifieddate?: string;
  };
};

export async function syncHubspot(creds: Credentials, since: Date): Promise<SyncItem[]> {
  const sinceMs = since.getTime();
  const items: SyncItem[] = [];

  const authHeader = { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' };

  // Deals modified since `since`
  const dealsRes = await safeFetch<HubSpotSearchResponse<HubSpotDeal>>(
    'https://api.hubapi.com/crm/v3/objects/deals/search',
    {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: sinceMs.toString() },
            ],
          },
        ],
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        properties: ['dealname', 'amount', 'dealstage', 'hs_lastmodifieddate', 'closedate'],
        limit: 50,
      }),
    },
  );

  for (const deal of dealsRes.results ?? []) {
    const updated = deal.properties.hs_lastmodifieddate
      ? new Date(Number(deal.properties.hs_lastmodifieddate))
      : new Date();
    const amount = deal.properties.amount ? `$${deal.properties.amount}` : '';
    items.push({
      sourceId: `hubspot:deal:${deal.id}`,
      title: `Deal updated: ${deal.properties.dealname ?? deal.id}${amount ? ` (${amount})` : ''}`,
      body: `Stage: ${deal.properties.dealstage ?? 'unknown'}. Close date: ${deal.properties.closedate ?? 'unset'}.`,
      priority: 'NORMAL',
      occurredAt: updated,
      sourceUrl: `https://app.hubspot.com/contacts/deals/${deal.id}`,
      metadata: { objectType: 'deal', stage: deal.properties.dealstage },
    });
  }

  // Contacts modified since `since`
  const contactsRes = await safeFetch<HubSpotSearchResponse<HubSpotContact>>(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: 'lastmodifieddate', operator: 'GTE', value: sinceMs.toString() },
            ],
          },
        ],
        sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
        properties: ['firstname', 'lastname', 'email', 'company', 'lastmodifieddate'],
        limit: 50,
      }),
    },
  );

  for (const contact of contactsRes.results ?? []) {
    const updated = contact.properties.lastmodifieddate
      ? new Date(contact.properties.lastmodifieddate)
      : new Date();
    const name = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ').trim();
    items.push({
      sourceId: `hubspot:contact:${contact.id}`,
      title: `Contact updated: ${name || contact.properties.email || contact.id}`,
      body: `${contact.properties.company ?? ''}${contact.properties.email ? ` · ${contact.properties.email}` : ''}`.trim(),
      priority: 'LOW',
      occurredAt: updated,
      sourceUrl: `https://app.hubspot.com/contacts/contacts/${contact.id}`,
      metadata: { objectType: 'contact' },
    });
  }

  return items;
}
