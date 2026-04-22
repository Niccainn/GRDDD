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

    /**
     * List recent Gmail messages in the primary inbox.
     * Two-step fetch: list ids (cheap), then `messages.get` per id
     * with format=metadata to pull only the headers we need.
     * Parallel gets keep latency flat even at limit=25.
     */
    async listRecentMessages(limit = 20): Promise<Array<{
      id: string;
      threadId: string;
      from: string;
      fromEmail: string;
      subject: string;
      snippet: string;
      date: string;
      unread: boolean;
      starred: boolean;
    }>> {
      const accessToken = await token();
      const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      listUrl.searchParams.set('maxResults', String(Math.min(Math.max(limit, 1), 50)));
      listUrl.searchParams.set('labelIds', 'INBOX');
      listUrl.searchParams.set('q', 'in:inbox -category:promotions -category:social');

      const listRes = await fetch(listUrl.toString(), { headers: googleAuthHeaders(accessToken) });
      if (!listRes.ok) {
        const text = await listRes.text();
        throw new Error(`Gmail list failed (${listRes.status}): ${text.slice(0, 200)}`);
      }
      const listData = (await listRes.json()) as {
        messages?: Array<{ id: string; threadId: string }>;
      };
      const ids = listData.messages ?? [];
      if (ids.length === 0) return [];

      // Fetch each message's metadata in parallel. Gmail's per-user
      // quota is generous; 25 parallel gets is well within limits.
      const messages = await Promise.all(
        ids.map(async ({ id, threadId }) => {
          const detailUrl = new URL(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
          );
          detailUrl.searchParams.set('format', 'metadata');
          detailUrl.searchParams.append('metadataHeaders', 'From');
          detailUrl.searchParams.append('metadataHeaders', 'Subject');
          detailUrl.searchParams.append('metadataHeaders', 'Date');
          const res = await fetch(detailUrl.toString(), {
            headers: googleAuthHeaders(accessToken),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as {
            id: string;
            threadId: string;
            snippet?: string;
            internalDate?: string;
            labelIds?: string[];
            payload?: {
              headers?: Array<{ name: string; value: string }>;
            };
          };
          const header = (name: string) =>
            data.payload?.headers?.find(
              h => h.name.toLowerCase() === name.toLowerCase(),
            )?.value ?? '';
          const fromRaw = header('From');
          // "Jane Doe <jane@x.com>" → name "Jane Doe", email "jane@x.com"
          const emailMatch = fromRaw.match(/<([^>]+)>/);
          const fromEmail = emailMatch ? emailMatch[1] : fromRaw;
          const fromName = emailMatch
            ? fromRaw.slice(0, emailMatch.index).replace(/"/g, '').trim()
            : fromRaw;
          const labels = data.labelIds ?? [];
          const dateValue = data.internalDate
            ? new Date(Number(data.internalDate)).toISOString()
            : header('Date') || new Date().toISOString();
          return {
            id: data.id,
            threadId: data.threadId,
            from: fromName || fromEmail,
            fromEmail,
            subject: header('Subject') || '(no subject)',
            snippet: data.snippet ?? '',
            date: dateValue,
            unread: labels.includes('UNREAD'),
            starred: labels.includes('STARRED'),
          };
        }),
      );
      return messages.filter(
        (m): m is NonNullable<typeof m> => m !== null,
      );
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

    /**
     * Create a Gmail draft. WRITE — the draft is saved, not sent, so
     * this is Phase-5-approval-safe on its own; the executor layer
     * still routes user-visible email steps through a HITL gate so
     * the user clicks Send themselves from Gmail.
     *
     * `from` defaults to `me` (the authenticated user's primary
     * address). `to` is a single recipient for v1 — multi-recipient
     * is trivial to add when a real template needs it.
     */
    async gmailCreateDraft(args: {
      to: string;
      subject: string;
      body: string;
    }): Promise<{ id: string; threadId: string | null; url: string }> {
      const accessToken = await token();

      // Build the RFC-2822 message. Gmail accepts simple
      // "From/To/Subject/Content-Type" headers + a plain-text body.
      // We base64url-encode per the API contract.
      const raw = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        args.body,
      ].join('\r\n');
      const encoded = Buffer.from(raw, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
        {
          method: 'POST',
          headers: {
            ...googleAuthHeaders(accessToken),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: { raw: encoded } }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gmail draft create failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        id: string;
        message?: { threadId?: string; id?: string };
      };
      // Gmail doesn't return a direct URL for a draft, but the drafts
      // folder is a stable deep link the user can follow to find it.
      const url = `https://mail.google.com/mail/u/0/#drafts`;
      return { id: data.id, threadId: data.message?.threadId ?? null, url };
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
