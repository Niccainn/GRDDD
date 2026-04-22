'use client';

/**
 * EventDetailDrawer — a right-side slide-in that shows the full
 * details of a clicked calendar event. Handles tasks, goals, and
 * external (Google Calendar / Outlook) events with the same shape.
 *
 * Keyboard: Esc closes. Focus-traps on open (first focusable element
 * gets focus). Respects prefers-reduced-motion (no slide animation
 * for users who have it on).
 *
 * No mutation logic in the drawer itself — it's a viewer. The Open
 * button deep-links to the source (/tasks/:id, /goals/:id, or the
 * external provider URL).
 */

import { useEffect, useRef } from 'react';

export type DrawerEvent = {
  id: string;
  type: 'task' | 'goal' | 'meeting' | 'external';
  title: string;
  date: string;
  endDate?: string;
  status: string;
  color: string;
  systemName: string | null;
  source?: string;
  meta: Record<string, unknown>;
  href: string;
};

type Props = {
  event: DrawerEvent | null;
  onClose: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatIcalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function googleCalendarUrl(title: string, start: string, end: string, location?: string | null, description?: string | null): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatIcalDate(start)}/${formatIcalDate(end)}`,
    ...(location ? { location } : {}),
    ...(description ? { details: description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function outlookUrl(title: string, start: string, end: string, location?: string | null, description?: string | null): string {
  const p = new URLSearchParams({
    subject: title,
    startdt: new Date(start).toISOString(),
    enddt: new Date(end).toISOString(),
    ...(location ? { location } : {}),
    ...(description ? { body: description } : {}),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${p}`;
}

function downloadIcs(title: string, start: string, end: string, location?: string | null, description?: string | null) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GRID//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DTSTART:${formatIcalDate(start)}`,
    `DTEND:${formatIcalDate(end)}`,
    location ? `LOCATION:${location}` : '',
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : '',
    `UID:${Date.now()}@grid`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function EventDetailDrawer({ event, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open so Esc or Enter immediately works
  // for keyboard users who triggered the drawer.
  useEffect(() => {
    if (event) closeBtnRef.current?.focus();
  }, [event]);

  // Global Esc to close — bound to window so it works regardless of
  // which element inside the drawer happens to have focus.
  useEffect(() => {
    if (!event) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [event, onClose]);

  if (!event) return null;

  const reduced = prefersReducedMotion();
  const transform = reduced ? 'none' : 'translateX(0)';

  const typeLabel =
    event.type === 'task' ? 'Task' :
    event.type === 'goal' ? 'Goal' :
    event.type === 'meeting' ? 'Meeting' :
    'Meeting';

  const description = typeof event.meta?.description === 'string' ? event.meta.description : null;
  const location = typeof event.meta?.location === 'string' ? event.meta.location : null;
  const meetLink = typeof event.meta?.meetLink === 'string' ? event.meta.meetLink : null;
  const assignee = typeof event.meta?.assignee === 'string' ? event.meta.assignee : null;
  const attendees = Array.isArray(event.meta?.attendees) ? (event.meta.attendees as string[]) : null;

  return (
    <>
      {/* Backdrop — click anywhere outside the drawer to close. */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.25)', transition: reduced ? 'none' : 'opacity 180ms ease' }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${typeLabel}: ${event.title}`}
        className="fixed top-0 right-0 h-screen w-[360px] z-50 p-6 flex flex-col"
        style={{
          background: 'rgba(12,12,18,0.97)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid var(--glass-border)',
          transform,
          transition: reduced ? 'none' : 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-light tracking-[0.16em] uppercase px-2 py-0.5 rounded-full"
              style={{
                background: `${event.color}14`,
                border: `1px solid ${event.color}30`,
                color: event.color,
              }}
            >
              {typeLabel}
            </span>
            {event.systemName && (
              <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                · {event.systemName}
              </span>
            )}
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close details"
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-3)' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <h2 className="text-base font-light leading-snug mb-2" style={{ color: 'var(--text-1)' }}>
          {event.title}
        </h2>

        <p className="text-xs font-light mb-5" style={{ color: 'var(--text-3)' }}>
          {formatDate(event.date)}
          {event.endDate && event.endDate !== event.date && <> → {formatDate(event.endDate)}</>}
        </p>

        {description && (
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
              Details
            </p>
            <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {description}
            </p>
          </div>
        )}

        {(location || meetLink || assignee || (attendees && attendees.length > 0)) && (
          <dl className="space-y-2 mb-5">
            {location && (
              <div className="flex gap-3 text-xs">
                <dt className="w-16 font-light" style={{ color: 'var(--text-3)' }}>Where</dt>
                <dd className="flex-1 font-light" style={{ color: 'var(--text-2)' }}>{location}</dd>
              </div>
            )}
            {meetLink && (
              <div className="flex gap-3 text-xs">
                <dt className="w-16 font-light" style={{ color: 'var(--text-3)' }}>Link</dt>
                <dd className="flex-1 font-light truncate">
                  <a href={meetLink} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--brand)' }}>
                    Join meeting →
                  </a>
                </dd>
              </div>
            )}
            {assignee && (
              <div className="flex gap-3 text-xs">
                <dt className="w-16 font-light" style={{ color: 'var(--text-3)' }}>Assignee</dt>
                <dd className="flex-1 font-light" style={{ color: 'var(--text-2)' }}>{assignee}</dd>
              </div>
            )}
            {attendees && attendees.length > 0 && (
              <div className="flex gap-3 text-xs">
                <dt className="w-16 font-light flex-shrink-0" style={{ color: 'var(--text-3)' }}>Attendees</dt>
                <dd className="flex-1 flex flex-wrap gap-1">
                  {attendees.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-[10px] font-light"
                      style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)', color: '#E879F9' }}
                    >
                      {a}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* Add to Calendar — shown for both native meetings and external events */}
        {(event.type === 'meeting' || event.type === 'external') && event.endDate && (
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
              Add to calendar
            </p>
            <div className="flex gap-2 flex-wrap">
              <a
                href={googleCalendarUrl(event.title, event.date, event.endDate, location, description)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-[11px] font-light px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)', color: '#4285f4' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="2" opacity=".2"/><text x="5" y="8" fontSize="7" textAnchor="middle" fill="currentColor">G</text></svg>
                Google
              </a>
              <a
                href={outlookUrl(event.title, event.date, event.endDate, location, description)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-[11px] font-light px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,120,212,0.08)', border: '1px solid rgba(0,120,212,0.2)', color: '#0078d4' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="2" opacity=".2"/><text x="5" y="8" fontSize="7" textAnchor="middle" fill="currentColor">O</text></svg>
                Outlook
              </a>
              <button
                onClick={() => downloadIcs(event.title, event.date, event.endDate!, location, description)}
                className="flex items-center gap-1.5 text-[11px] font-light px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-2)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M5 1v6M2 7l3 2 3-2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9h8" strokeLinecap="round"/>
                </svg>
                .ics
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto">
          {event.type === 'meeting' && meetLink ? (
            <a
              href={meetLink}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-center text-xs font-light py-2.5 rounded-full w-full"
              style={{
                background: 'rgba(232,121,249,0.1)',
                border: '1px solid rgba(232,121,249,0.3)',
                color: '#E879F9',
              }}
            >
              Join meeting →
            </a>
          ) : (
            <a
              href={event.href}
              target={event.type === 'external' ? '_blank' : '_self'}
              rel={event.type === 'external' ? 'noreferrer noopener' : undefined}
              className="block text-center text-xs font-light py-2.5 rounded-full w-full"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
              }}
            >
              {event.type === 'external' ? 'Open in provider →' : 'Open full view →'}
            </a>
          )}
          <p className="text-[10px] font-light text-center mt-2" style={{ color: 'var(--text-3)' }}>
            Esc to close · Click outside to dismiss
          </p>
        </div>
      </aside>
    </>
  );
}
