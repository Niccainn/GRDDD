/**
 * Google Calendar read client.
 *
 * Uses the standalone google_calendar integration (separate from
 * google_workspace). Shares the same Google OAuth infrastructure
 * and token refresh logic via google-shared.ts.
 */

import { loadGoogleIntegration, getGoogleAccessToken, googleAuthHeaders } from './google-shared';
import { GOOGLE_CALENDAR_PROVIDER } from '../oauth/google';

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

export async function getGoogleCalendarClient(integrationId: string, environmentId: string) {
  const integration = await loadGoogleIntegration(integrationId, environmentId, 'google_calendar');

  async function token() {
    return await getGoogleAccessToken(integration, GOOGLE_CALENDAR_PROVIDER);
  }

  return {
    integration,

    /**
     * List calendar events in a date range.
     * Returns up to maxResults events sorted by start time.
     */
    async listEvents(start: Date, end: Date, maxResults = 50) {
      const accessToken = await token();
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', start.toISOString());
      url.searchParams.set('timeMax', end.toISOString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', String(maxResults));

      const res = await fetch(url.toString(), { headers: googleAuthHeaders(accessToken) });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Calendar events query failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as GoogleCalendarListResponse;
      return (data.items ?? []).map(ev => ({
        id: ev.id,
        title: ev.summary ?? '(no title)',
        description: ev.description ?? null,
        start: ev.start?.dateTime ? new Date(ev.start.dateTime) : ev.start?.date ? new Date(ev.start.date) : null,
        end: ev.end?.dateTime ? new Date(ev.end.dateTime) : ev.end?.date ? new Date(ev.end.date) : null,
        location: ev.location ?? null,
        meetLink: ev.hangoutLink ?? null,
        htmlLink: ev.htmlLink ?? null,
        status: ev.status ?? 'confirmed',
      }));
    },

    /**
     * Create a tentative event on the primary calendar. WRITE — only
     * called through an approval-gated executor. Defaults to
     * `status: 'tentative'` so the human can review before confirming
     * to attendees. Invitations are NOT sent (sendUpdates=none) until
     * the user explicitly flips the status.
     */
    async createDraftEvent(args: {
      title: string;
      description?: string | null;
      start: Date;
      end: Date;
      attendees?: string[];
      location?: string | null;
    }): Promise<{ id: string; url: string | null }> {
      const accessToken = await token();
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('sendUpdates', 'none');
      const body = {
        summary: args.title.slice(0, 200),
        description: args.description ?? undefined,
        start: { dateTime: args.start.toISOString() },
        end: { dateTime: args.end.toISOString() },
        status: 'tentative',
        location: args.location ?? undefined,
        attendees: (args.attendees ?? []).map(email => ({ email, responseStatus: 'needsAction' })),
      };
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { ...googleAuthHeaders(accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Calendar create failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { id: string; htmlLink?: string };
      return { id: data.id, url: data.htmlLink ?? null };
    },
  };
}
