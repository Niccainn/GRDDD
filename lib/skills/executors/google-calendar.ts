/**
 * Google Calendar real executor — creates a tentative event on the
 * primary calendar. Defaults to a 1-hour block tomorrow at 10am if
 * the step doesn't carry explicit timing inputs.
 *
 * Invitations are not sent; status is 'tentative' so the human
 * decides whether to convert to a confirmed event. The Zapier-style
 * trace links straight to the event page.
 */

import { randomUUID } from 'node:crypto';
import { getGoogleCalendarClient } from '@/lib/integrations/clients/google-calendar';
import { resolveIntegration } from './resolve';
import type { Executor } from './types';
import type { Artifact } from '@/lib/projects/types';

const PROVIDER_FALLBACKS = ['google_calendar', 'gcal'];

type EventInputs = {
  title?: string;
  description?: string;
  start?: string | Date;
  end?: string | Date;
  durationMinutes?: number;
  location?: string | null;
  attendees?: string[] | string;
};

function nextWorkday10am(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  // Skip weekends — push to Monday if Saturday (6) or Sunday (0).
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

function parseDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseAttendees(value: EventInputs['attendees']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(s => typeof s === 'string' && s.includes('@'));
  if (typeof value === 'string') {
    return value
      .split(/[,\s;]+/)
      .map(s => s.trim())
      .filter(s => s.includes('@'));
  }
  return [];
}

export const googleCalendarDraftEvent: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();

  // Find a connected Calendar integration.
  let integration = null;
  for (const provider of PROVIDER_FALLBACKS) {
    integration = await resolveIntegration(project.environmentId, provider);
    if (integration) break;
  }

  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Google Calendar: no active Calendar integration for this Environment. Connect Google Calendar to stage events for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as EventInputs;
  const startInput = parseDate(inputs.start);
  const endInputExplicit = parseDate(inputs.end);
  const durationMinutes =
    typeof inputs.durationMinutes === 'number' && inputs.durationMinutes > 0
      ? inputs.durationMinutes
      : 60;

  const start = startInput ?? nextWorkday10am();
  const end =
    endInputExplicit ?? new Date(start.getTime() + durationMinutes * 60_000);

  const title =
    (inputs.title && inputs.title.slice(0, 200)) ||
    step.title ||
    `Project: ${project.goal.slice(0, 80)}`;
  const description = inputs.description ?? [
    step.rationale,
    '',
    `Created by Nova as part of "${project.goal}".`,
    'Status: tentative. Nothing was sent to attendees. Confirm the event in Google Calendar to invite them.',
  ].join('\n');
  const attendees = parseAttendees(inputs.attendees);

  try {
    const client = await getGoogleCalendarClient(integration.id, project.environmentId);
    const event = await client.createDraftEvent({
      title,
      description,
      start,
      end,
      attendees,
      location: inputs.location ?? null,
    });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Calendar event · ${title}`,
      kind: 'other',
      tool: 'google_calendar',
      url: event.url,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          eventId: event.id,
          url: event.url,
          start: start.toISOString(),
          end: end.toISOString(),
          attendees,
          status: 'tentative',
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Staged tentative calendar event for ${start.toLocaleString()} (${durationMinutes}m). ${
            attendees.length === 0
              ? 'No attendees set — add them in Google Calendar before confirming.'
              : `${attendees.length} attendee${attendees.length === 1 ? '' : 's'} listed, none notified yet.`
          }`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Calendar error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Google Calendar draft failed: ${msg}. The integration is connected but the call errored — check the scope or the primary calendar permissions.`,
        },
      ],
      mode: 'real',
    };
  }
};
