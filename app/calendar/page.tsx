'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import QuickAddPopover from '@/components/calendar/QuickAddPopover';
import EventDetailDrawer, { type DrawerEvent } from '@/components/calendar/EventDetailDrawer';
import { bucketEventsByDay, nextFocusDay } from '@/lib/calendar/buckets';

type CalendarEvent = {
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

type ConnectedCalendar = {
  id: string;
  provider: string;
  displayName: string;
  accountLabel: string | null;
  status: string;
};

type CalendarProvider = {
  id: string;
  name: string;
  glyph: string;
  accentColor: string;
  authType: string;
};

type CalendarLayer = {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  type: 'internal' | 'external';
  icon: string;
};

const CALENDAR_PROVIDERS: CalendarProvider[] = [
  { id: 'google_calendar', name: 'Google Calendar', glyph: '◰', accentColor: '#4285f4', authType: 'oauth' },
  { id: 'microsoft_outlook', name: 'Microsoft Outlook', glyph: '◲', accentColor: '#0078d4', authType: 'oauth' },
  { id: 'apple_calendar', name: 'Apple Calendar', glyph: '◳', accentColor: '#333333', authType: 'api_key' },
  { id: 'caldav', name: 'CalDAV', glyph: '◱', accentColor: '#6b7280', authType: 'api_key' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const statusColor: Record<string, string> = {
  DONE: '#C8F26B', COMPLETED: '#C8F26B', IN_PROGRESS: '#7193ED',
  TODO: 'rgba(255,255,255,0.3)', ON_TRACK: '#C8F26B',
  AT_RISK: '#F7C700', BEHIND: '#FF6B6B', RUNNING: '#7193ED',
  external: '#BF9FF1',
};

const sourceLabel: Record<string, string> = {
  google_calendar: 'Google',
  microsoft_outlook: 'Outlook',
  apple_calendar: 'iCloud',
  caldav: 'CalDAV',
};

const sourceColor: Record<string, string> = {
  google_calendar: '#4285f4',
  microsoft_outlook: '#0078d4',
  apple_calendar: '#555555',
  caldav: '#6b7280',
};

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState<ConnectedCalendar[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);

  // Layers — toggleable calendar views
  const [layers, setLayers] = useState<CalendarLayer[]>([
    { id: 'tasks', label: 'Tasks', color: '#7193ED', visible: true, type: 'internal', icon: '#' },
    { id: 'goals', label: 'Goals & Milestones', color: '#C8F26B', visible: true, type: 'internal', icon: '*' },
    { id: 'nova', label: 'Nova Checkpoints', color: '#BF9FF1', visible: true, type: 'internal', icon: '~' },
  ]);

  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  }, []);

  // Load connected calendars + build external layers
  useEffect(() => {
    fetch('/api/environments')
      .then(r => r.json())
      .then((envs: { id: string; name: string }[]) => {
        setEnvironments(envs);
        if (envs.length > 0) {
          fetch(`/api/integrations?environmentId=${envs[0].id}`)
            .then(r => r.json())
            .then(d => {
              const calIntegrations: ConnectedCalendar[] = (d.integrations ?? d ?? []).filter(
                (i: ConnectedCalendar) => CALENDAR_PROVIDERS.some(p => p.id === i.provider)
              );
              setConnected(calIntegrations);

              // Add external calendar layers
              setLayers(prev => {
                const existing = prev.filter(l => l.type === 'internal');
                const externalLayers: CalendarLayer[] = calIntegrations.map(cal => ({
                  id: `ext_${cal.id}`,
                  label: cal.accountLabel ?? cal.displayName,
                  color: sourceColor[cal.provider] ?? '#BF9FF1',
                  visible: true,
                  type: 'external',
                  icon: CALENDAR_PROVIDERS.find(p => p.id === cal.provider)?.glyph ?? '~',
                }));
                return [...existing, ...externalLayers];
              });
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const dismissed = localStorage.getItem('grid:calendar-banner-dismissed');
    if (dismissed) setBannerDismissed(true);
  }, []);

  // Sources with non-ok status from the API, keyed by integration id.
  // Used to render an inline "Google Calendar: token expired" banner
  // instead of silently showing an empty month.
  const [sourceStatus, setSourceStatus] = useState<Record<string, {
    ok: boolean;
    reason?: string;
    integrationId: string;
    displayName: string;
  }>>({});

  // Load events
  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.events ?? []);
        setSourceStatus(d.sourceStatus ?? {});
      })
      .catch(() => {});
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function dismissBanner() {
    setBannerDismissed(true);
    localStorage.setItem('grid:calendar-banner-dismissed', 'true');
  }
  function connectCalendar(provider: CalendarProvider) {
    if (provider.authType === 'oauth' && environments.length > 0) {
      window.location.href = `/api/integrations/oauth/${provider.id}/start?environmentId=${environments[0].id}`;
    } else {
      window.location.href = `/integrations?category=calendar`;
    }
  }

  // Filter events by visible layers
  const visibleEvents = events.filter(ev => {
    if (ev.type === 'task') return layers.find(l => l.id === 'tasks')?.visible;
    if (ev.type === 'goal') return layers.find(l => l.id === 'goals')?.visible;
    if (ev.type === 'external' && ev.source) {
      const extLayer = layers.find(l => l.type === 'external' && l.label.includes(ev.source!));
      return extLayer?.visible ?? true;
    }
    return true;
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const showBanner = connected.length === 0 && !bannerDismissed;

  // Bucket events by day ONCE per (events, year, month) change — not
  // on every render. Halves render cost on big months.
  const bucketByDay = useMemo(
    () => bucketEventsByDay(visibleEvents, year, month),
    [visibleEvents, year, month],
  );
  const eventsForDay = useCallback(
    (day: number): CalendarEvent[] => bucketByDay.get(day) ?? [],
    [bucketByDay],
  );

  // ── Interactive state ──────────────────────────────────────────────
  // focusedDay: what the keyboard cursor is on (1..daysInMonth).
  // quickAddDay: null when popover closed; otherwise the day it anchors to.
  // selectedEvent: null when drawer closed; otherwise the event shown.
  // view: Month grid vs. Agenda list (fallback when users want
  //   everything at a glance — the "please just list them" affordance).
  const initialFocus = today.getMonth() === month && today.getFullYear() === year
    ? today.getDate()
    : 1;
  const [focusedDay, setFocusedDay] = useState<number>(initialFocus);
  const [quickAddDay, setQuickAddDay] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DrawerEvent | null>(null);
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [reducedMotion, setReducedMotion] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Respect OS motion preference so month-transition animation doesn't
  // trigger vestibular symptoms. WCAG 2.1 Success Criterion 2.3.3.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // When the user changes month, reset focus to day 1 (or today if
  // they're back on the current month).
  useEffect(() => {
    setFocusedDay(
      today.getMonth() === month && today.getFullYear() === year ? today.getDate() : 1,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // Keyboard navigation on the grid. Arrow keys move focus, Enter opens
  // quick-add on the focused day, Esc closes any open overlay.
  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const nav = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (nav.includes(e.key)) {
        e.preventDefault();
        setFocusedDay(prev => nextFocusDay({ current: prev, daysInMonth, key: e.key }));
        return;
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        prevMonth();
        return;
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        nextMonth();
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && view === 'month') {
        e.preventDefault();
        const dayEvents = eventsForDay(focusedDay);
        if (dayEvents.length > 0) {
          // Prefer showing detail if the day has events; the user
          // can still add via the hover "+" button.
          setSelectedEvent(dayEvents[0] as unknown as DrawerEvent);
        } else {
          setQuickAddDay(focusedDay);
        }
      }
    },
    [daysInMonth, focusedDay, eventsForDay, view],
  );

  // Optimistic insert when quick-add succeeds so the new event shows
  // up instantly without waiting for the next fetch cycle.
  const handleCreated = useCallback((task: { id: string; title: string; dueDate: string; priority: string }) => {
    setEvents(prev => [
      ...prev,
      {
        id: task.id,
        type: 'task',
        title: task.title,
        date: task.dueDate,
        status: 'TODO',
        color: '#7193ED',
        systemName: null,
        meta: { priority: task.priority },
        href: '/tasks',
      },
    ]);
  }, []);

  return (
    <div className="flex gap-6 p-8">
      {/* ── Main calendar area ──────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl">
        {/* Integration Connect Banner */}
        {showBanner && (
          <div
            className="relative rounded-2xl p-5 mb-6 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(66,133,244,0.08) 0%, rgba(191,159,241,0.06) 50%, rgba(0,120,212,0.08) 100%)',
              border: '1px solid rgba(66,133,244,0.15)',
            }}
          >
            <button
              onClick={dismissBanner}
              className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l8 8M9 1l-8 8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.2)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" /><path d="M16 2v4M8 2v4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>
                  Connect your calendars
                </h2>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  Layer your team calendars over GRID tasks and goals. Toggle any calendar on or off — see everything or just what matters now.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CALENDAR_PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => connectCalendar(provider)}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition-all hover:scale-[1.02] text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${provider.accentColor}14`, border: `1px solid ${provider.accentColor}26`, color: provider.accentColor }}
                  >
                    {provider.glyph}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-light block" style={{ color: 'var(--text-1)' }}>{provider.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {provider.authType === 'oauth' ? 'Connect' : 'Add credentials'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-light" style={{ color: 'var(--text-1)' }}>Calendar</h1>
            <p className="text-sm font-light mt-0.5" style={{ color: 'var(--text-3)' }}>
              {connected.length > 0
                ? `${layers.filter(l => l.visible).length} layers active`
                : 'Tasks, goals, and milestones'}
            </p>
            {/* Inline source-status banner + one-click reconnect.
                Users no longer see an empty month with zero
                explanation; they see the reason AND a button that
                starts the fix without leaving the page. */}
            {Object.values(sourceStatus).filter(s => !s.ok).map(s => {
              // Map integration row → provider id from the connected list.
              const conn = connected.find(c => c.id === s.integrationId);
              const envId = environments[0]?.id;
              const reconnect = async () => {
                if (!conn || !envId) return;
                // Fire-and-forget disconnect so the new OAuth row replaces
                // rather than stacks. Ignore failure — worst case the user
                // ends up with two rows of the same provider, which is
                // benign and a disconnect button next to it fixes.
                await fetch(`/api/integrations/${s.integrationId}`, {
                  method: 'DELETE',
                }).catch(() => {});
                window.location.href = `/api/integrations/oauth/${conn.provider}/start?environmentId=${envId}`;
              };

              // Google's "API not enabled" 403 is a Cloud Console
              // config issue, not a reconnect issue. Detecting it
              // lets us deep-link straight to the Enable button
              // with the project id baked into the URL — users go
              // from error → fix in one click.
              const reasonText = s.reason ?? 'fetch failed';
              const apiDisabledMatch = reasonText.match(/project (\d+) before or it is disabled/);
              const isApiDisabled = !!apiDisabledMatch;
              const enableUrl = apiDisabledMatch
                ? `https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=${apiDisabledMatch[1]}`
                : null;

              return (
                <div
                  key={s.integrationId}
                  className="flex items-start gap-2 mt-1 text-[11px] font-light flex-wrap"
                  style={{ color: '#FF6B6B' }}
                >
                  <span className="max-w-2xl">
                    ⚠ {s.displayName}:{' '}
                    {isApiDisabled
                      ? 'Google Calendar API is not enabled in your Google Cloud project. Enable it and refresh this page.'
                      : reasonText}
                  </span>
                  {isApiDisabled && enableUrl ? (
                    <a
                      href={enableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255,107,107,0.1)',
                        border: '1px solid rgba(255,107,107,0.3)',
                        color: '#FF6B6B',
                      }}
                    >
                      Enable Calendar API →
                    </a>
                  ) : conn && envId ? (
                    <button
                      onClick={reconnect}
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255,107,107,0.1)',
                        border: '1px solid rgba(255,107,107,0.3)',
                        color: '#FF6B6B',
                      }}
                    >
                      Reconnect →
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                <path d="M8 1L3 6l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-sm font-light min-w-[140px] text-center" style={{ color: 'var(--text-1)' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                <path d="M4 1l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
              className="text-xs px-3 py-1.5 rounded-lg font-light"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-3)' }}
            >
              Today
            </button>
            {/* View toggle — Month grid vs Agenda list. Renders inline
                so keyboard tab order is predictable. */}
            <div
              role="tablist"
              aria-label="Calendar view"
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--glass-border)' }}
            >
              {(['month', 'agenda'] as const).map(v => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className="text-xs font-light px-3 py-1.5 capitalize transition-colors"
                  style={{
                    background: view === v ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: view === v ? 'var(--text-1)' : 'var(--text-3)',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            {connected.length === 0 && bannerDismissed && (
              <button
                onClick={() => { setBannerDismissed(false); localStorage.removeItem('grid:calendar-banner-dismissed'); }}
                className="text-xs px-3 py-1.5 rounded-lg font-light flex items-center gap-1.5"
                style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.15)', color: '#4285f4' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 1v8M1 5h8" strokeLinecap="round" />
                </svg>
                Sync
              </button>
            )}
          </div>
        </div>

        {view === 'month' ? (
          <>
            {/* Day headers — labelled as row-1 column headers for screen readers */}
            <div role="row" className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div
                  key={d}
                  role="columnheader"
                  aria-label={d}
                  className="text-center text-[10px] font-light py-2"
                  style={{ color: 'var(--text-3)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Interactive calendar grid. role="grid" + tabIndex on the
                container gives us ONE tab stop for the whole month;
                arrow keys then move between cells per WAI-ARIA grid
                pattern. Every cell with a day is a gridcell with its
                own visible focus ring when focusedDay matches. */}
            <div
              role="grid"
              aria-label={`${MONTHS[month]} ${year}`}
              tabIndex={0}
              ref={gridRef}
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-7 rounded-xl overflow-hidden outline-none"
              style={{
                border: '1px solid var(--glass-border)',
                transition: reducedMotion ? 'none' : 'opacity 160ms ease',
              }}
            >
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  role="gridcell"
                  aria-hidden
                  className="min-h-[100px] p-2"
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid var(--glass-border)',
                    borderRight: '1px solid var(--glass-border)',
                  }}
                />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                const todayHighlight = isToday(day);
                const focused = focusedDay === day;
                const dateObj = new Date(year, month, day);
                const aria = dateObj.toLocaleDateString(undefined, {
                  weekday: 'long', month: 'long', day: 'numeric',
                });

                return (
                  <div
                    key={day}
                    role="gridcell"
                    tabIndex={-1}
                    aria-label={`${aria}${dayEvents.length > 0 ? `, ${dayEvents.length} events` : ', no events'}${todayHighlight ? ', today' : ''}`}
                    aria-selected={focused}
                    onClick={() => {
                      setFocusedDay(day);
                      // Empty day → quick-add. Day with events → drawer
                      // for first event; user can still click a specific
                      // event bar to target it precisely.
                      if (dayEvents.length === 0) setQuickAddDay(day);
                    }}
                    className="relative min-h-[100px] p-2 transition-colors cursor-pointer group outline-none"
                    style={{
                      background: todayHighlight
                        ? 'rgba(191,159,241,0.04)'
                        : focused
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(255,255,255,0.015)',
                      borderBottom: '1px solid var(--glass-border)',
                      borderRight: '1px solid var(--glass-border)',
                      boxShadow: focused ? 'inset 0 0 0 1.5px rgba(191,159,241,0.5)' : undefined,
                      transition: reducedMotion ? 'none' : 'background 120ms ease',
                    }}
                    onMouseEnter={() => setFocusedDay(day)}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="text-xs font-light inline-flex items-center justify-center w-6 h-6 rounded-full"
                        style={{
                          color: todayHighlight ? '#BF9FF1' : 'var(--text-3)',
                          background: todayHighlight ? 'rgba(191,159,241,0.15)' : 'transparent',
                        }}
                      >
                        {day}
                      </span>

                      {/* Hover affordance — the "+" only appears when
                          the day is empty so it doesn't fight with
                          the event bars visually. Stopping propagation
                          means the click adds instead of opening a
                          detail drawer for the first event. */}
                      {dayEvents.length === 0 && (
                        <button
                          aria-label={`Add task for ${aria}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedDay(day);
                            setQuickAddDay(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: 'var(--glass)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-3)',
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>

                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev as unknown as DrawerEvent);
                          }}
                          className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-light truncate transition-all"
                          style={{
                            background: `${ev.source ? sourceColor[ev.source] ?? ev.color : ev.color}14`,
                            border: `1px solid ${ev.source ? sourceColor[ev.source] ?? ev.color : ev.color}26`,
                            color: ev.source ? sourceColor[ev.source] ?? ev.color : ev.color,
                            textAlign: 'left',
                          }}
                          title={`${ev.source ? sourceLabel[ev.source] ?? ev.source : ev.type}: ${ev.title}`}
                        >
                          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: ev.source ? sourceColor[ev.source] ?? ev.color : statusColor[ev.status] ?? ev.color }} />
                          <span className="truncate">{ev.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show the first as the entry point; the
                            // drawer links back to the full view where
                            // all events are listed.
                            setSelectedEvent(dayEvents[3] as unknown as DrawerEvent);
                          }}
                          className="text-[9px] px-1.5 font-light"
                          style={{ color: 'var(--text-3)' }}
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>

                    {/* Anchored quick-add popover for this day. Rendered
                        absolute-positioned relative to the cell so it
                        opens right where the user clicked. */}
                    {quickAddDay === day && (
                      <div
                        className="absolute z-30 top-full left-0 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <QuickAddPopover
                          year={year}
                          month={month}
                          day={day}
                          environmentId={environments[0]?.id ?? null}
                          onClose={() => setQuickAddDay(null)}
                          onCreated={(task) => {
                            handleCreated(task);
                            setQuickAddDay(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] font-light mt-2" style={{ color: 'var(--text-3)' }}>
              Click any day to add · Click an event for details · ←↑→↓ to navigate · PgUp/PgDn for months
            </p>
          </>
        ) : (
          /* Agenda view — flat chronological list of everything visible */
          <div className="space-y-1.5">
            {visibleEvents.length === 0 ? (
              <div
                className="py-16 text-center rounded-xl"
                style={{ border: '1px dashed var(--glass-border)' }}
              >
                <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
                  Nothing scheduled for {MONTHS[month]}
                </p>
                <p className="text-xs font-light mt-1" style={{ color: 'var(--text-3)' }}>
                  Switch to Month view and click any day to add.
                </p>
              </div>
            ) : (
              visibleEvents.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEvent(ev as unknown as DrawerEvent)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ev.source ? sourceColor[ev.source] ?? ev.color : ev.color }}
                  />
                  <span className="text-xs font-light flex-1 truncate" style={{ color: 'var(--text-1)' }}>
                    {ev.title}
                  </span>
                  {ev.source && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: `${sourceColor[ev.source] ?? '#BF9FF1'}14`, color: sourceColor[ev.source] ?? 'var(--text-3)' }}
                    >
                      {sourceLabel[ev.source] ?? ev.source}
                    </span>
                  )}
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: `${statusColor[ev.status] ?? ev.color}14`, color: statusColor[ev.status] ?? ev.color }}
                  >
                    {ev.type === 'external' ? 'meeting' : ev.status.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Event detail drawer — rendered at page level so the slide
          animation isn't clipped by column padding. */}
      <EventDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* ── Layer sidebar ──────────────────────────────────────────── */}
      <div className="w-[200px] flex-shrink-0 hidden lg:block">
        <div
          className="sticky top-8 rounded-2xl p-4"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-[10px] font-light tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
            CALENDARS
          </h3>

          {/* Internal layers */}
          <div className="space-y-1 mb-4">
            {layers.filter(l => l.type === 'internal').map(layer => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left"
                style={{ opacity: layer.visible ? 1 : 0.35 }}
              >
                <div
                  className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: layer.visible ? layer.color : 'transparent',
                    border: `1.5px solid ${layer.color}`,
                  }}
                >
                  {layer.visible && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M1.5 4l2 2 3-3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{layer.label}</span>
              </button>
            ))}
          </div>

          {/* External calendar layers */}
          {layers.filter(l => l.type === 'external').length > 0 && (
            <>
              <h3 className="text-[10px] font-light tracking-wider mb-2 mt-4" style={{ color: 'var(--text-3)' }}>
                SYNCED
              </h3>
              <div className="space-y-1 mb-4">
                {layers.filter(l => l.type === 'external').map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left"
                    style={{ opacity: layer.visible ? 1 : 0.35 }}
                  >
                    <div
                      className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: layer.visible ? layer.color : 'transparent',
                        border: `1.5px solid ${layer.color}`,
                      }}
                    >
                      {layer.visible && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                          <path d="M1.5 4l2 2 3-3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>{layer.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Add calendar button */}
          <button
            onClick={() => {
              if (connected.length === 0 && bannerDismissed) {
                setBannerDismissed(false);
                localStorage.removeItem('grid:calendar-banner-dismissed');
              } else {
                window.location.href = '/integrations?category=calendar';
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left mt-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
              <path d="M6 1v10M1 6h10" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>Add calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
