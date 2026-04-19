/**
 * GET /api/calendar?start=ISO&end=ISO — unified calendar events.
 *
 * Merges:
 *   1. GRID tasks (by dueDate)
 *   2. GRID goals (by dueDate)
 *   3. External calendar events (from connected Google Calendar, Outlook, etc.)
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const CALENDAR_PROVIDER_IDS = ['google_calendar', 'microsoft_outlook', 'apple_calendar', 'caldav'];
const CALENDAR_COLORS: Record<string, string> = {
  google_calendar: '#4285f4',
  microsoft_outlook: '#0078d4',
  apple_calendar: '#555555',
  caldav: '#6b7280',
};

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');

  if (!start || !end) {
    return Response.json({ error: 'start and end query params required (ISO dates)' }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  // Fetch internal events + connected calendar integrations in parallel
  const [tasks, goals, calendarIntegrations] = await Promise.all([
    prisma.task.findMany({
      where: {
        environment: { ownerId: identity.id, deletedAt: null },
        dueDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: { select: { name: true } },
        system: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.goal.findMany({
      where: {
        environment: { ownerId: identity.id, deletedAt: null },
        dueDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        system: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.integration.findMany({
      where: {
        environment: { ownerId: identity.id, deletedAt: null },
        provider: { in: CALENDAR_PROVIDER_IDS },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        provider: true,
        displayName: true,
        accountLabel: true,
        environmentId: true,
      },
    }),
  ]);

  type CalendarEvent = {
    id: string;
    type: 'task' | 'goal' | 'external';
    title: string;
    date: Date | null;
    endDate?: Date | null;
    status: string;
    color: string;
    systemName: string | null;
    source?: string;
    meta: Record<string, unknown>;
    href: string;
  };

  const events: CalendarEvent[] = [
    ...tasks.map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      date: t.dueDate,
      status: t.status,
      color: t.system?.color ?? '#7193ED',
      systemName: t.system?.name ?? null,
      meta: { priority: t.priority, assignee: t.assignee?.name ?? null },
      href: `/tasks`,
    })),
    ...goals.map(g => ({
      id: g.id,
      type: 'goal' as const,
      title: g.title,
      date: g.dueDate,
      status: g.status,
      color: g.system?.color ?? '#C8F26B',
      systemName: g.system?.name ?? null,
      meta: { progress: g.progress },
      href: `/goals`,
    })),
  ];

  // Fetch external calendar events from connected providers.
  // Previously this swallowed every error silently — users saw
  // "Google Calendar connected" and an empty calendar with zero
  // explanation. Now we:
  //   1. Log each failure to AppError so ops can see it
  //   2. Return a `sourceStatus` map alongside events so the UI can
  //      render an inline "Google Calendar: token expired" banner
  //      per NN/g's finding on explained failure
  const sourceStatus: Record<string, { ok: boolean; reason?: string; integrationId: string; displayName: string }> = {};

  for (const integration of calendarIntegrations) {
    try {
      const externalEvents = await fetchExternalCalendarEvents(
        integration.id,
        integration.provider,
        startDate,
        endDate,
      );
      events.push(...externalEvents.map(e => ({
        ...e,
        source: integration.provider,
        color: CALENDAR_COLORS[integration.provider] ?? '#BF9FF1',
      })));
      sourceStatus[integration.id] = {
        ok: true,
        integrationId: integration.id,
        displayName: integration.displayName,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 200) : 'Unknown error';
      sourceStatus[integration.id] = {
        ok: false,
        reason,
        integrationId: integration.id,
        displayName: integration.displayName,
      };
      // Fire-and-forget — don't block the calendar response on logging.
      import('@/lib/observability/errors').then(({ logError }) =>
        logError({
          scope: 'calendar_external_fetch',
          environmentId: integration.environmentId,
          message: `${integration.provider} fetch failed: ${reason}`,
          context: { integrationId: integration.id, provider: integration.provider },
        }),
      ).catch(() => {});
    }
  }

  events.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  return Response.json({ events, sourceStatus });
}

/**
 * Fetch events from an external calendar provider.
 * Each provider has its own client module that handles OAuth token
 * refresh and API calls. Returns a normalized event shape.
 */
async function fetchExternalCalendarEvents(
  integrationId: string,
  provider: string,
  start: Date,
  end: Date,
): Promise<Array<{
  id: string;
  type: 'external';
  title: string;
  date: Date;
  endDate?: Date;
  status: string;
  systemName: null;
  meta: Record<string, unknown>;
  href: string;
}>> {
  // Resolve the environmentId from the integration record
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { environmentId: true },
  });
  if (!integration?.environmentId) return [];

  let rawEvents: Array<{
    id: string;
    title: string;
    description?: string | null;
    start: Date | null;
    end?: Date | null;
    location?: string | null;
    meetLink?: string | null;
    htmlLink?: string | null;
    status: string;
  }> = [];

  switch (provider) {
    case 'google_calendar': {
      const { getGoogleCalendarClient } = await import('@/lib/integrations/clients/google-calendar');
      const client = await getGoogleCalendarClient(integrationId, integration.environmentId);
      rawEvents = await client.listEvents(start, end);
      break;
    }
    case 'microsoft_outlook': {
      const { getMicrosoftOutlookClient } = await import('@/lib/integrations/clients/microsoft-outlook');
      const client = await getMicrosoftOutlookClient(integrationId, integration.environmentId);
      rawEvents = await client.listEvents(start, end);
      break;
    }
    default:
      // apple_calendar and caldav not yet implemented — skip gracefully
      return [];
  }

  return rawEvents
    .filter(e => e.start !== null)
    .map(e => ({
      id: e.id,
      type: 'external' as const,
      title: e.title,
      date: e.start!,
      endDate: e.end ?? undefined,
      status: e.status,
      systemName: null,
      meta: {
        description: e.description,
        location: e.location,
        meetLink: e.meetLink,
      },
      href: e.htmlLink ?? '#',
    }));
}
