/**
 * Microsoft Outlook Calendar read client.
 *
 * Uses Microsoft Graph API v1.0 calendarView endpoint.
 * Handles token refresh via the stored refresh token.
 */

import { prisma } from '@/lib/db';
import { decryptString, encryptString } from '@/lib/crypto/key-encryption';
import { MICROSOFT_OUTLOOK_PROVIDER } from '../oauth/microsoft';
import { refreshAccessToken } from '../oauth/base';

type MicrosoftCalendarEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  webLink?: string;
  onlineMeeting?: { joinUrl?: string };
  isCancelled?: boolean;
};

type MicrosoftCalendarResponse = {
  value?: MicrosoftCalendarEvent[];
};

const REFRESH_SKEW_MS = 60 * 1000;

export async function getMicrosoftOutlookClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      environmentId,
      provider: 'microsoft_outlook',
      deletedAt: null,
      status: 'ACTIVE',
    },
  });
  if (!integration) throw new Error('Microsoft Outlook integration not found or not active');

  async function token(): Promise<string> {
    const creds = JSON.parse(decryptString(integration!.credentialsEnc)) as { accessToken: string };
    const notExpired =
      integration!.expiresAt && integration!.expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS;
    if (notExpired) return creds.accessToken;

    if (!integration!.refreshTokenEnc) return creds.accessToken;

    const refreshToken = decryptString(integration!.refreshTokenEnc);
    const refreshed = await refreshAccessToken(MICROSOFT_OUTLOOK_PROVIDER, refreshToken);
    const newAccessToken = refreshed.access_token;
    const newExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : null;

    await prisma.integration.update({
      where: { id: integration!.id },
      data: {
        credentialsEnc: encryptString(JSON.stringify({ accessToken: newAccessToken })),
        expiresAt: newExpiresAt,
        lastSyncedAt: new Date(),
      },
    });

    return newAccessToken;
  }

  return {
    integration,

    /**
     * List calendar events in a date range using Microsoft Graph calendarView.
     */
    async listEvents(start: Date, end: Date, maxResults = 50) {
      const accessToken = await token();
      const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView');
      url.searchParams.set('startDateTime', start.toISOString());
      url.searchParams.set('endDateTime', end.toISOString());
      url.searchParams.set('$top', String(maxResults));
      url.searchParams.set('$orderby', 'start/dateTime');
      url.searchParams.set('$select', 'id,subject,bodyPreview,start,end,location,webLink,onlineMeeting,isCancelled');

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          Prefer: 'outlook.timezone="UTC"',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft Calendar query failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as MicrosoftCalendarResponse;
      return (data.value ?? [])
        .filter(ev => !ev.isCancelled)
        .map(ev => ({
          id: ev.id,
          title: ev.subject ?? '(no title)',
          description: ev.bodyPreview ?? null,
          start: ev.start?.dateTime ? new Date(ev.start.dateTime + 'Z') : null,
          end: ev.end?.dateTime ? new Date(ev.end.dateTime + 'Z') : null,
          location: ev.location?.displayName ?? null,
          meetLink: ev.onlineMeeting?.joinUrl ?? null,
          htmlLink: ev.webLink ?? null,
          status: 'confirmed',
        }));
    },
  };
}
