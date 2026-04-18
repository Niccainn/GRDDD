/**
 * Google Calendar sync fetcher.
 *
 * Pulls upcoming events from the primary calendar so the user's
 * "what's coming" inbox includes real meetings. `timeMin` is `since`
 * to capture anything that was added/updated recently; `timeMax` is
 * now + 7 days so we don't pull a year's worth of schedule in one
 * shot.
 *
 * Google tokens expire every hour and need the refresh-token dance.
 * We only attempt the access token here; OAuth refresh is handled
 * at the client layer before dispatch. If the token is expired the
 * 401 falls through as a generic fetch_failed result in the
 * dispatcher — the integration surface re-prompts the user.
 */

import { safeFetch } from '../clients/fetch-safe';
import type { Credentials, SyncItem } from './dispatcher';

type GCalEvent = {
  id: string;
  status: string;
  htmlLink: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  updated: string;
  attendees?: { email: string; responseStatus: string }[];
};

type GCalList = {
  items: GCalEvent[];
};

export async function syncGoogleCalendar(
  creds: Credentials,
  since: Date,
): Promise<SyncItem[]> {
  const now = new Date();
  // Only fetch events updated since the last sync — upstream filter
  // reduces payload size vs. pulling the full 7-day window each tick.
  const params = new URLSearchParams({
    singleEvents: 'true', // expand recurring → individual occurrences
    orderBy: 'startTime',
    updatedMin: since.toISOString(),
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    maxResults: '50',
  });

  const res = await safeFetch<GCalList>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${creds.accessToken}` } },
  );

  const items: SyncItem[] = [];
  for (const ev of res.items ?? []) {
    if (ev.status === 'cancelled') continue;
    const startIso = ev.start.dateTime ?? ev.start.date;
    if (!startIso) continue;
    const start = new Date(startIso);

    items.push({
      sourceId: `gcal:${ev.id}`,
      title: ev.summary?.slice(0, 200) ?? 'Untitled event',
      body:
        (ev.description?.slice(0, 400) ?? '') +
        (ev.attendees?.length
          ? `\n\nAttendees: ${ev.attendees.length} (${ev.attendees.filter(a => a.responseStatus === 'accepted').length} accepted)`
          : ''),
      priority: 'NORMAL',
      occurredAt: start,
      sourceUrl: ev.htmlLink,
      metadata: { attendeeCount: ev.attendees?.length ?? 0 },
    });
  }
  return items;
}
