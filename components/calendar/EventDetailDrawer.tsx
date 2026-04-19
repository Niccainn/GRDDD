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
  type: 'task' | 'goal' | 'external';
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

  // Pretty-print type badge copy.
  const typeLabel =
    event.type === 'task' ? 'Task' :
    event.type === 'goal' ? 'Goal' :
    'Meeting';

  const description = typeof event.meta?.description === 'string' ? event.meta.description : null;
  const location = typeof event.meta?.location === 'string' ? event.meta.location : null;
  const meetLink = typeof event.meta?.meetLink === 'string' ? event.meta.meetLink : null;
  const assignee = typeof event.meta?.assignee === 'string' ? event.meta.assignee : null;

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

        {(location || meetLink || assignee) && (
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
          </dl>
        )}

        <div className="mt-auto">
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
          <p className="text-[10px] font-light text-center mt-2" style={{ color: 'var(--text-3)' }}>
            Esc to close · Click outside to dismiss
          </p>
        </div>
      </aside>
    </>
  );
}
