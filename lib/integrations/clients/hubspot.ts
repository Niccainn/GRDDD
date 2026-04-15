/**
 * HubSpot read client. Uses the CRM v3 API. Implements lazy refresh
 * of access tokens (30-minute lifetime) from the stored refresh token.
 */

import type { Integration } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decryptString, encryptString } from '@/lib/crypto/key-encryption';
import { refreshAccessToken } from '../oauth/base';
import { HUBSPOT_PROVIDER } from '../oauth/hubspot';

const API_BASE = 'https://api.hubapi.com';
const REFRESH_SKEW_MS = 60 * 1000;

type HubSpotCreds = { accessToken: string };

async function freshAccessToken(integration: Integration): Promise<string> {
  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as HubSpotCreds;
  const notExpired = integration.expiresAt && integration.expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS;
  if (notExpired || !integration.refreshTokenEnc) return creds.accessToken;

  const refreshToken = decryptString(integration.refreshTokenEnc);
  const refreshed = await refreshAccessToken(HUBSPOT_PROVIDER, refreshToken);
  const newToken = refreshed.access_token;
  const newExpiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      credentialsEnc: encryptString(JSON.stringify({ accessToken: newToken })),
      expiresAt: newExpiresAt,
      lastSyncedAt: new Date(),
    },
  });
  return newToken;
}

export async function getHubSpotClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'hubspot', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('HubSpot integration not found or not active');

  async function headers() {
    const token = await freshAccessToken(integration!);
    return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  }

  return {
    integration,

    /** Recent contacts by lastmodifieddate. */
    async getRecentContacts(limit = 20) {
      const url = `${API_BASE}/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,lifecyclestage,lastmodifieddate&sorts=-lastmodifieddate`;
      const res = await fetch(url, { headers: await headers() });
      if (!res.ok) throw new Error(`HubSpot contacts failed: ${res.status}`);
      const data = (await res.json()) as {
        results: { id: string; properties: Record<string, string> }[];
      };
      return data.results.map(r => ({
        id: r.id,
        email: r.properties.email,
        firstName: r.properties.firstname,
        lastName: r.properties.lastname,
        lifecycleStage: r.properties.lifecyclestage,
        lastModified: r.properties.lastmodifieddate,
      }));
    },

    /**
     * Create a new HubSpot contact. WRITE — Phase 6 approval-gated.
     * Email is the only required property; first/last name are optional.
     */
    async createContact(args: {
      email: string;
      firstName?: string;
      lastName?: string;
      lifecycleStage?: string;
    }): Promise<{ id: string }> {
      const properties: Record<string, string> = { email: args.email };
      if (args.firstName) properties.firstname = args.firstName;
      if (args.lastName) properties.lastname = args.lastName;
      if (args.lifecycleStage) properties.lifecyclestage = args.lifecycleStage;
      const res = await fetch(`${API_BASE}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: { ...(await headers()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HubSpot createContact failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },

    /** Deal pipeline totals grouped by stage. */
    async getOpenDeals(limit = 50) {
      const url = `${API_BASE}/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate&sorts=-amount`;
      const res = await fetch(url, { headers: await headers() });
      if (!res.ok) throw new Error(`HubSpot deals failed: ${res.status}`);
      const data = (await res.json()) as {
        results: { id: string; properties: Record<string, string> }[];
      };
      return data.results.map(r => ({
        id: r.id,
        name: r.properties.dealname,
        amount: Number(r.properties.amount ?? 0),
        stage: r.properties.dealstage,
        closeDate: r.properties.closedate,
      }));
    },
  };
}
