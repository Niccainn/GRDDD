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
      color: g.system?.color ?? '#15AD70',
      systemName: g.system?.name ?? null,
      meta: { progress: g.progress },
      href: `/goals`,
    })),
  ];

  // Fetch external calendar events from connected providers.
  // Each provider client returns events in a standardized shape.
  // When a provider's client isn't implemented yet, we skip gracefully.
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
    } catch {
      // External calendar fetch failed — skip gracefully, don't break the page
    }
  }

  events.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  return Response.json({ events });
}

/**
 * Fetch events from an external calendar provider.
 * This is the integration point — each provider has its own client module.
 * Returns a normalized event shape regardless of provider.
 */
async function fetchExternalCalendarEvents(
  _integrationId: string,
  _provider: string,
  _start: Date,
  _end: Date,
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
  // Provider-specific client implementations go here.
  // For now, return empty — the UI is ready to render events
  // as soon as a provider client (e.g., Google Calendar API)
  // is wired up to fetch and normalize events.
  //
  // Example flow for Google Calendar:
  //   1. Load integration, decrypt OAuth token
  //   2. GET https://www.googleapis.com/calendar/v3/calendars/primary/events
  //      ?timeMin={start}&timeMax={end}&singleEvents=true&orderBy=startTime
  //   3. Map each event to { id, type:'external', title: event.summary, ... }
  return [];
}
