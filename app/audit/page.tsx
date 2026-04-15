'use client';

import { useEffect, useState, useCallback } from 'react';

type AuditEntry = {
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

const ACTION_META: Record<string, { color: string; icon: string }> = {
  'workflow.created':      { color: '#15AD70', icon: '＋' },
  'workflow.updated':      { color: '#7193ED', icon: '✎' },
  'workflow.deleted':      { color: '#FF6B6B', icon: '✕' },
  'workflow.status_changed':{ color: '#F7C700', icon: '◎' },
  'execution.started':     { color: '#7193ED', icon: '▶' },
  'execution.completed':   { color: '#15AD70', icon: '✓' },
  'execution.failed':      { color: '#FF6B6B', icon: '✗' },
  'system.created':        { color: '#15AD70', icon: '＋' },
  'system.updated':        { color: '#7193ED', icon: '✎' },
  'system.deleted':        { color: '#FF6B6B', icon: '✕' },
  'environment.created':   { color: '#15AD70', icon: '＋' },
  'environment.updated':   { color: '#7193ED', icon: '✎' },
  'member.added':          { color: '#BF9FF1', icon: '＋' },
  'member.removed':        { color: '#FF6B6B', icon: '✕' },
  'member.role_changed':   { color: '#F7C700', icon: '⇄' },
  'nova.query':            { color: '#BF9FF1', icon: '⚡' },
  'nova.memory_updated':   { color: '#BF9FF1', icon: '◈' },
  'automation.created':    { color: '#15AD70', icon: '＋' },
  'automation.toggled':    { color: '#F7C700', icon: '⏺' },
  'automation.run':        { color: '#7193ED', icon: '⏱' },
  'webhook.created':       { color: '#15AD70', icon: '＋' },
  'webhook.deleted':       { color: '#FF6B6B', icon: '✕' },
  'webhook.test':          { color: '#7193ED', icon: '⌁' },
};

const ACTION_GROUPS = [
  'workflow', 'execution', 'system', 'environment', 'member', 'nova', 'automation', 'webhook',
];

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)    return `${d}s ago`;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAction(action: string): string {
  return action.replace('.', ' · ').replace(/_/g, ' ');
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const load = useCallback(() => {
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(page * LIMIT),
      ...(search       ? { search }       : {}),
      ...(filterAction ? { action: filterAction } : {}),
    });
    fetch(`/api/audit?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs); setTotal(d.total); setLoaded(true); });
  }, [search, filterAction, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(); }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function renderDiff(entry: AuditEntry) {
    if (!entry.before && !entry.after && !entry.metadata) return null;
    try {
      const b = entry.before  ? JSON.parse(entry.before)  : null;
      const a = entry.after   ? JSON.parse(entry.after)   : null;
      const m = entry.metadata ? JSON.parse(entry.metadata) : null;
      const data = m ?? a ?? b;
      if (!data) return null;
      return (
        <pre className="text-xs font-light leading-relaxed overflow-x-auto mt-2 p-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', maxHeight: 200 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch { return null; }
  }

  // Group by date
  const grouped: { date: string; entries: AuditEntry[] }[] = [];
  let lastDate = '';
  for (const entry of logs) {
    const date = new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (date !== lastDate) {
      grouped.push({ date, entries: [] });
      lastDate = date;
    }
    grouped[grouped.length - 1].entries.push(entry);
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Audit Log</h1>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Complete history of all changes and actions · {total.toLocaleString()} events
        </p>
      </div>

      {/* Activity feed banner */}
      <a
        href="/activity"
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6 transition-all group"
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--glass)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
        }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v5l3 2.5" stroke="#7193ED" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="7" r="5.5" stroke="#7193ED" strokeWidth="1.1" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>View the full activity feed</p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Timeline view with filtering, search, and infinite scroll</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 transition-transform group-hover:translate-x-0.5">
          <path d="M5 3l4 4-4 4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events···"
            className="w-full text-sm font-light pl-9 pr-4 py-2 rounded-lg focus:outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white' }}
          />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.6)' }}>
          <option value="">All actions</option>
          {ACTION_GROUPS.map(g => (
            <option key={g} value={g} style={{ background: '#111' }}>{g}</option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No activity yet</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Actions like creating workflows, running executions, and querying Nova will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.date}>
              <p className="text-xs tracking-[0.1em] mb-3 sticky top-16"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                {group.date.toUpperCase()}
              </p>
              <div className="space-y-0.5">
                {group.entries.map(entry => {
                  const meta = ACTION_META[entry.action] ?? { color: 'rgba(255,255,255,0.3)', icon: '·' };
                  const isOpen = expanded === entry.id;
                  const hasDetail = !!(entry.before || entry.after || entry.metadata);
                  return (
                    <div key={entry.id}
                      className={`rounded-xl px-4 py-3 transition-all ${hasDetail ? 'cursor-pointer' : ''}`}
                      style={{ background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent', border: `1px solid ${isOpen ? 'rgba(255,255,255,0.08)' : 'transparent'}` }}
                      onClick={() => hasDetail && setExpanded(isOpen ? null : entry.id)}>
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                          style={{ background: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}25` }}>
                          {meta.icon}
                        </span>

                        {/* Action + entity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.75)' }}>
                              {formatAction(entry.action)}
                            </span>
                            {entry.entityName && (
                              <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                · {entry.entityName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {entry.actorName && <span>{entry.actorName}</span>}
                            {entry.environmentName && <>
                              <span>·</span>
                              <span>{entry.environmentName}</span>
                            </>}
                          </div>
                        </div>

                        {/* Time + expand hint */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasDetail && (
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
                              {isOpen ? '▲' : '▼'}
                            </span>
                          )}
                          <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {timeAgo(entry.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && renderDiff(entry)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="text-xs font-light px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
                  ← Prev
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total}
                  className="text-xs font-light px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
