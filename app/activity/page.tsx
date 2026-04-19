'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { relativeTime } from '@/lib/time';

// ── Types ───────────────────────────────────────────────────────────

type ActivityEvent = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityName: string | null;
  actorName: string | null;
  actorType: string | null;
  environmentName: string | null;
  before: string | null;
  after: string | null;
  metadata: string | null;
};

// ── Event metadata ──────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  'system.created': '#C8F26B',
  'system.updated': '#C8F26B',
  'system.deleted': '#FF6B6B',
  'workflow.created': '#C8F26B',
  'workflow.updated': '#C8F26B',
  'workflow.deleted': '#FF6B6B',
  'workflow.status_changed': '#F7C700',
  'execution.started': '#7193ED',
  'execution.completed': '#7193ED',
  'execution.failed': '#FF6B6B',
  'goal.created': '#F7C700',
  'goal.updated': '#F7C700',
  'goal.reached': '#F7C700',
  'agent.invoked': '#BF9FF1',
  'nova.query': '#BF9FF1',
  'nova.memory_updated': '#BF9FF1',
  'member.added': '#FF9F43',
  'member.removed': '#FF9F43',
  'member.role_changed': '#FF9F43',
  'automation.created': '#C8F26B',
  'automation.toggled': '#F7C700',
  'automation.run': '#7193ED',
  'webhook.created': '#C8F26B',
  'webhook.deleted': '#FF6B6B',
  'webhook.test': '#7193ED',
  'environment.created': '#C8F26B',
  'environment.updated': '#7193ED',
};

function getDotColor(action: string): string {
  if (DOT_COLORS[action]) return DOT_COLORS[action];
  // Fallback by prefix
  if (action.startsWith('system.') || action.startsWith('workflow.')) return '#C8F26B';
  if (action.startsWith('execution.')) return '#7193ED';
  if (action.startsWith('goal.')) return '#F7C700';
  if (action.startsWith('nova.') || action.startsWith('agent.')) return '#BF9FF1';
  if (action.startsWith('member.')) return '#FF9F43';
  return 'rgba(255,255,255,0.3)';
}

const EVENT_ICONS: Record<string, string> = {
  'system.created': '+',
  'system.updated': '~',
  'system.deleted': 'x',
  'workflow.created': '+',
  'workflow.updated': '~',
  'workflow.deleted': 'x',
  'workflow.status_changed': 'o',
  'execution.started': '>',
  'execution.completed': 'v',
  'execution.failed': '!',
  'goal.created': '+',
  'goal.updated': '~',
  'goal.reached': '*',
  'nova.query': 'z',
  'nova.memory_updated': 'm',
  'agent.invoked': 'z',
  'member.added': '+',
  'member.removed': 'x',
  'member.role_changed': '~',
  'automation.created': '+',
  'automation.toggled': 'o',
  'automation.run': '>',
  'webhook.created': '+',
  'webhook.deleted': 'x',
  'webhook.test': '>',
  'environment.created': '+',
  'environment.updated': '~',
};

// SVG icon components by action type prefix
function EventIcon({ action }: { action: string }) {
  const prefix = action.split('.')[0];
  const suffix = action.split('.')[1] ?? '';
  const color = getDotColor(action);

  // Created / added
  if (suffix === 'created' || suffix === 'added') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 3v8M3 7h8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  // Deleted / removed
  if (suffix === 'deleted' || suffix === 'removed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M4 4l6 6M10 4l-6 6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  // Execution started / run
  if (suffix === 'started' || suffix === 'run') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3.5l5 3.5-5 3.5V3.5z" fill={color} opacity="0.8" />
      </svg>
    );
  }
  // Completed / reached
  if (suffix === 'completed' || suffix === 'reached') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3.5 7.5l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Failed
  if (suffix === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 4v3.5M7 9.5v.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  // Updated / changed / toggled
  if (suffix === 'updated' || suffix === 'status_changed' || suffix === 'role_changed' || suffix === 'toggled') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M4 7h6M8 4.5L10.5 7 8 9.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Nova / agent / query
  if (prefix === 'nova' || prefix === 'agent') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2.5L10 7l-3 4.5L4 7l3-4.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  // Default
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.5" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

// ── Entity routing ──────────────────────────────────────────────────

function entityHref(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  const routes: Record<string, string> = {
    workflow: '/workflows',
    system: '/systems',
    environment: '/environments',
    goal: '/goals',
    execution: '/workflows',
    automation: '/workflows',
    agent: '/agents',
  };
  const base = routes[entity.toLowerCase()];
  if (!base) return null;
  return `${base}`;
}

function formatAction(action: string): string {
  return action.replace('.', ' ').replace(/_/g, ' ');
}

// ── Filters ─────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'system', label: 'Systems' },
  { key: 'workflow', label: 'Workflows' },
  { key: 'execution', label: 'Executions' },
  { key: 'goal', label: 'Goals' },
  { key: 'agent', label: 'Agent' },
  { key: 'team', label: 'Team' },
];

const RANGE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

// ── Component ───────────────────────────────────────────────────────

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (pg: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: '20',
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(rangeFilter !== 'all' ? { range: rangeFilter } : {}),
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      if (append) {
        setEvents(prev => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, rangeFilter, search]);

  // Initial load + filter changes
  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [fetchEvents]);

  // Debounced search
  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
    }, 300);
  }

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchEvents(next, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchEvents]);

  // Group events by date
  const grouped: { date: string; events: ActivityEvent[] }[] = [];
  let lastDate = '';
  for (const ev of events) {
    const date = new Date(ev.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (date !== lastDate) {
      grouped.push({ date, events: [] });
      lastDate = date;
    }
    grouped[grouped.length - 1].events.push(ev);
  }

  function renderMeta(ev: ActivityEvent) {
    const raw = ev.metadata || ev.after || ev.before;
    if (!raw) return null;
    try {
      const str = JSON.stringify(JSON.parse(raw), null, 2);
      const preview = str.length > 100 ? str.slice(0, 100) + '...' : str;
      return expanded === ev.id ? str : preview;
    } catch {
      return null;
    }
  }

  return (
    <div className="px-6 md:px-10 py-10 min-h-screen max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extralight tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
          Activity
        </h1>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          Everything happening across your workspace
          {total > 0 && (
            <span className="ml-2 tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {total.toLocaleString()} events
            </span>
          )}
        </p>
      </div>

      {/* Type filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TYPE_FILTERS.map(f => {
          const active = typeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                color: active ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Range + Search */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          {RANGE_FILTERS.map(f => {
            const active = rangeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setRangeFilter(f.key)}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full text-sm font-light pl-9 pr-4 py-2 rounded-xl focus:outline-none transition-all"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          />
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 w-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <div className="flex-1 h-16 rounded-2xl animate-pulse mb-2" style={{ background: 'var(--glass)' }} />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v6l3 3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No activity found</p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Activity from workflows, executions, and team actions will appear here
          </p>
        </div>
      ) : (
        <div>
          {grouped.map((group, gi) => (
            <div key={group.date} className={gi > 0 ? 'mt-8' : ''}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                </div>
                <p className="text-xs tracking-[0.12em] font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {group.date.toUpperCase()}
                </p>
              </div>

              {/* Events */}
              {group.events.map((ev, ei) => {
                const color = getDotColor(ev.action);
                const isLast = ei === group.events.length - 1 && gi === grouped.length - 1;
                const href = entityHref(ev.entity, ev.entityId);
                const meta = renderMeta(ev);
                const isExpanded = expanded === ev.id;

                return (
                  <div key={ev.id} className="flex gap-4">
                    {/* Timeline rail */}
                    <div className="w-8 flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-4"
                        style={{
                          background: color,
                          boxShadow: `0 0 8px ${color}40, 0 0 0 3px rgba(8,8,12,0.9)`,
                        }}
                      />
                      {!isLast && (
                        <div className="flex-1 w-px min-h-[16px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      )}
                    </div>

                    {/* Event card */}
                    <div
                      className="flex-1 rounded-2xl px-4 py-3 mb-2 transition-all group"
                      style={{
                        background: 'var(--glass)',
                        border: '1px solid var(--glass-border)',
                        cursor: meta ? 'pointer' : 'default',
                      }}
                      onClick={() => meta && setExpanded(isExpanded ? null : ev.id)}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--glass-deep, rgba(255,255,255,0.06))';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--glass)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: `${color}10`,
                            border: `1px solid ${color}20`,
                          }}
                        >
                          <EventIcon action={ev.action} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-light capitalize" style={{ color: 'var(--text-1)' }}>
                              {formatAction(ev.action)}
                            </span>
                            {ev.entityName && href ? (
                              <Link
                                href={href}
                                className="text-sm font-light transition-colors hover:underline"
                                style={{ color: 'rgba(255,255,255,0.45)' }}
                                onClick={e => e.stopPropagation()}
                              >
                                {ev.entityName}
                              </Link>
                            ) : ev.entityName ? (
                              <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {ev.entityName}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            {ev.actorName && (
                              <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                                {ev.actorName}
                              </span>
                            )}
                            {ev.environmentName && (
                              <>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.1)' }}>
                                  /
                                </span>
                                <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                                  {ev.environmentName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Time + expand */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {meta && (
                            <svg
                              width="10" height="10" viewBox="0 0 10 10" fill="none"
                              className="transition-transform"
                              style={{
                                color: 'rgba(255,255,255,0.15)',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            >
                              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          <span className="text-xs font-light tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {relativeTime(ev.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Metadata preview */}
                      {isExpanded && meta && (
                        <pre
                          className="text-xs font-light leading-relaxed overflow-x-auto mt-3 p-3 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.35)',
                            fontFamily: 'monospace',
                            maxHeight: 200,
                          }}
                        >
                          {meta}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="h-16 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'transparent' }} />
                <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Loading more...</span>
              </div>
            )}
            {!hasMore && events.length > 0 && (
              <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.15)' }}>
                End of activity
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
