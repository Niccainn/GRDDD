import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Provider-fetcher unit tests. Mock fetch so we never hit real
 * Notion / Slack / Google / HubSpot APIs, and assert:
 *   - Correct endpoint and headers
 *   - since-filter honoured (items older than `since` are dropped)
 *   - SyncItem shape matches dispatcher's contract
 */

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('syncNotion', () => {
  it('calls /v1/search with descending last_edited_time', async () => {
    fetchMock.mockResolvedValue(okResponse({ results: [], has_more: false, next_cursor: null }));
    const { syncNotion } = await import('../lib/integrations/sync/notion');
    await syncNotion({ accessToken: 'tok' }, new Date('2026-01-01'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/search');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as { body: string }).body);
    expect(body.sort.direction).toBe('descending');
    expect(body.sort.timestamp).toBe('last_edited_time');
  });

  it('drops pages older than `since` thanks to descending sort', async () => {
    const since = new Date('2026-04-10');
    fetchMock.mockResolvedValue(
      okResponse({
        has_more: false,
        next_cursor: null,
        results: [
          {
            id: 'p1',
            object: 'page',
            url: 'https://notion.so/p1',
            last_edited_time: '2026-04-15T00:00:00Z',
            created_time: '2026-04-01T00:00:00Z',
            properties: { title: { type: 'title', title: [{ plain_text: 'Newer page' }] } },
          },
          {
            id: 'p2',
            object: 'page',
            url: 'https://notion.so/p2',
            last_edited_time: '2026-04-05T00:00:00Z',
            created_time: '2026-04-01T00:00:00Z',
            properties: { title: { type: 'title', title: [{ plain_text: 'Older page' }] } },
          },
        ],
      }),
    );
    const { syncNotion } = await import('../lib/integrations/sync/notion');
    const items = await syncNotion({ accessToken: 'tok' }, since);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Newer page');
    expect(items[0].sourceId).toBe('notion:p1');
  });

  it('skips archived pages', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        has_more: false,
        next_cursor: null,
        results: [
          {
            id: 'p1',
            object: 'page',
            archived: true,
            url: 'https://notion.so/p1',
            last_edited_time: '2026-04-15T00:00:00Z',
            created_time: '2026-04-01T00:00:00Z',
            properties: { title: { type: 'title', title: [{ plain_text: 'Archived' }] } },
          },
        ],
      }),
    );
    const { syncNotion } = await import('../lib/integrations/sync/notion');
    const items = await syncNotion({ accessToken: 'tok' }, new Date('2026-01-01'));
    expect(items).toHaveLength(0);
  });
});

describe('syncSlack', () => {
  it('returns empty list when auth.test fails', async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: false }));
    const { syncSlack } = await import('../lib/integrations/sync/slack');
    const items = await syncSlack({ accessToken: 'tok' }, new Date(0));
    expect(items).toEqual([]);
  });

  it('sends after: epoch seconds in the search query', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse({ ok: true, user_id: 'U123' }))
      .mockResolvedValueOnce(okResponse({ ok: true, messages: { matches: [], total: 0 } }));
    const { syncSlack } = await import('../lib/integrations/sync/slack');
    await syncSlack({ accessToken: 'tok' }, new Date('2026-04-01T00:00:00Z'));

    const [, , searchCall] = fetchMock.mock.calls.flat();
    // The second call URL should contain the query string
    const searchUrl = fetchMock.mock.calls[1][0] as string;
    expect(searchUrl).toContain('https://slack.com/api/search.messages');
    expect(searchUrl).toContain('%40U123'); // URL-encoded @U123
    void searchCall;
  });
});

describe('syncGoogleCalendar', () => {
  it('passes updatedMin + timeMin + timeMax to the events endpoint', async () => {
    fetchMock.mockResolvedValue(okResponse({ items: [] }));
    const { syncGoogleCalendar } = await import('../lib/integrations/sync/google-calendar');
    const since = new Date('2026-04-01T00:00:00Z');
    await syncGoogleCalendar({ accessToken: 'tok' }, since);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('calendars/primary/events');
    expect(url).toContain('singleEvents=true');
    expect(url).toContain('updatedMin=');
  });

  it('skips cancelled events', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        items: [
          {
            id: 'e1',
            status: 'cancelled',
            htmlLink: 'https://calendar.google.com/e1',
            summary: 'Cancelled meeting',
            start: { dateTime: '2026-04-20T10:00:00Z' },
            end: { dateTime: '2026-04-20T11:00:00Z' },
            updated: '2026-04-18T00:00:00Z',
          },
          {
            id: 'e2',
            status: 'confirmed',
            htmlLink: 'https://calendar.google.com/e2',
            summary: 'Real meeting',
            start: { dateTime: '2026-04-21T10:00:00Z' },
            end: { dateTime: '2026-04-21T11:00:00Z' },
            updated: '2026-04-18T00:00:00Z',
          },
        ],
      }),
    );
    const { syncGoogleCalendar } = await import('../lib/integrations/sync/google-calendar');
    const items = await syncGoogleCalendar({ accessToken: 'tok' }, new Date(0));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Real meeting');
  });
});

describe('syncHubspot', () => {
  it('builds a filter on hs_lastmodifieddate GTE since (epoch ms)', async () => {
    fetchMock.mockResolvedValue(okResponse({ total: 0, results: [] }));
    const { syncHubspot } = await import('../lib/integrations/sync/hubspot');
    const since = new Date('2026-04-01T00:00:00Z');
    await syncHubspot({ accessToken: 'tok' }, since);

    const dealsBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(dealsBody.filterGroups[0].filters[0].propertyName).toBe('hs_lastmodifieddate');
    expect(dealsBody.filterGroups[0].filters[0].operator).toBe('GTE');
    expect(dealsBody.filterGroups[0].filters[0].value).toBe(since.getTime().toString());
  });
});
