/**
 * Google Workspace read client. Exposes minimal read operations
 * against Gmail, Calendar, and Drive. accountLabel stores the user's
 * email address.
 */

import { loadGoogleIntegration, getGoogleAccessToken, googleAuthHeaders } from './google-shared';
import { GOOGLE_WORKSPACE_PROVIDER } from '../oauth/google';

export async function getGoogleWorkspaceClient(integrationId: string, environmentId: string) {
  const integration = await loadGoogleIntegration(integrationId, environmentId, 'google_workspace');

  async function token() {
    return await getGoogleAccessToken(integration, GOOGLE_WORKSPACE_PROVIDER);
  }

  return {
    integration,

    /** Count unread Gmail threads in the primary inbox. */
    async gmailUnreadCount(): Promise<{ unread: number }> {
      const accessToken = await token();
      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX',
        { headers: googleAuthHeaders(accessToken) },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gmail inbox query failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { threadsUnread?: number };
      return { unread: data.threadsUnread ?? 0 };
    },

    /** List upcoming calendar events in the next N days. */
    async listUpcomingEvents(days = 7, maxResults = 10) {
      const accessToken = await token();
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', now.toISOString());
      url.searchParams.set('timeMax', future.toISOString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', String(maxResults));
      const res = await fetch(url.toString(), { headers: googleAuthHeaders(accessToken) });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Calendar events query failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        items?: {
          id: string;
          summary?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          hangoutLink?: string;
        }[];
      };
      return (data.items ?? []).map(ev => ({
        id: ev.id,
        summary: ev.summary ?? '(no title)',
        start: ev.start?.dateTime ?? ev.start?.date,
        end: ev.end?.dateTime ?? ev.end?.date,
        meetLink: ev.hangoutLink,
      }));
    },

    /** List files recently modified in Drive. */
    async listRecentDriveFiles(limit = 10) {
      const accessToken = await token();
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('pageSize', String(limit));
      url.searchParams.set('orderBy', 'modifiedTime desc');
      url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,webViewLink)');
      const res = await fetch(url.toString(), { headers: googleAuthHeaders(accessToken) });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Drive list failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        files?: { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink: string }[];
      };
      return data.files ?? [];
    },
  };
}
