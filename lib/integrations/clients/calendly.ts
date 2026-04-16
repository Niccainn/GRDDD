/**
 * Calendly read client. Bearer token authentication against the v2 API.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type CalendlyCreds = { accessToken: string };

const API_BASE = 'https://api.calendly.com';

export async function getCalendlyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'calendly', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Calendly integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as CalendlyCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** Get the current authenticated user. Returns the user URI needed for other calls. */
    async getUser() {
      const url = `${API_BASE}/users/me`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Calendly error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        resource: { uri: string; name: string; email: string; timezone: string; scheduling_url: string };
      };
      return {
        uri: data.resource.uri,
        name: data.resource.name,
        email: data.resource.email,
        timezone: data.resource.timezone,
        schedulingUrl: data.resource.scheduling_url,
      };
    },

    /** List upcoming scheduled events. Requires the user URI from getUser(). */
    async listEvents(limit = 20) {
      // First resolve the current user URI for the filter
      const meRes = await fetch(`${API_BASE}/users/me`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!meRes.ok) throw new Error(`Calendly error (${meRes.status}): ${(await meRes.text()).slice(0, 200)}`);
      const me = (await meRes.json()) as { resource: { uri: string } };

      const params = new URLSearchParams({
        user: me.resource.uri,
        count: String(limit),
        status: 'active',
        sort: 'start_time:asc',
        min_start_time: new Date().toISOString(),
      });
      const url = `${API_BASE}/scheduled_events?${params}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Calendly error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        collection: {
          uri: string; name: string; status: string;
          start_time: string; end_time: string; event_type: string; location: { type: string } | null;
        }[];
      };
      return data.collection.map(e => ({
        uri: e.uri,
        name: e.name,
        status: e.status,
        startTime: e.start_time,
        endTime: e.end_time,
        locationType: e.location?.type ?? null,
      }));
    },
  };
}
