'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Signal = {
  id: string;
  title: string;
  body: string | null;
  source: string;
  priority: string;
  status: string;
  systemId: string | null;
  system: { id: string; name: string; color: string | null } | null;
  workflowId: string | null;
  workflow: { id: string; name: string } | null;
  novaTriaged: boolean;
  novaRouting: { reasoning: string; confidence: number } | null;
  createdAt: string;
  updatedAt: string;
};

type System = { id: string; name: string; color: string | null };

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#FF4D4D',
  HIGH:   '#F7C700',
  NORMAL: 'rgba(255,255,255,0.3)',
  LOW:    'rgba(255,255,255,0.15)',
};

const PRIORITY_BG: Record<string, string> = {
  URGENT: 'rgba(255,77,77,0.1)',
  HIGH:   'rgba(247,199,0,0.08)',
  NORMAL: 'rgba(255,255,255,0.04)',
  LOW:    'rgba(255,255,255,0.02)',
};

const STATUS_COLOR: Record<string, string> = {
  UNREAD:    '#BF9FF1',
  READ:      'rgba(255,255,255,0.3)',
  TRIAGED:   '#15AD70',
  DISMISSED: 'rgba(255,255,255,0.15)',
};

const SOURCE_ICON: Record<string, string> = {
  manual: '✎', api: '⌁', email: '✉', webhook: '⇀', nova: '⚡',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function InboxPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [triaging, setTriaging] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ title: '', body: '', priority: 'NORMAL', environmentId: '', systemId: '' });
  const [saving, setSaving] = useState(false);

  // Integration-source layer toggles. Keyed on the full signal.source
  // string ("integration:notion" etc.) so two providers that happen to
  // share a display name don't collide.
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(new Set());
  const toggleSource = useCallback((src: string) => {
    setHiddenSources(prev => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src); else next.add(src);
      return next;
    });
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(priorityFilter ? { priority: priorityFilter } : {}),
    });
    fetch(`/api/signals?${params}`)
      .then(r => r.json())
      .then(d => { setSignals(d.signals); setUnreadCount(d.unreadCount); setLoaded(true); });
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    load();
    Promise.all([
      fetch('/api/systems').then(r => r.json()).catch(() => []),
      fetch('/api/environments').then(r => r.json()).catch(() => []),
    ]).then(([sys, envs]) => {
      setSystems(sys);
      setEnvironments(envs);
      if (envs.length > 0) setForm(f => ({ ...f, environmentId: envs[0].id }));
    });
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.environmentId) return;
    setSaving(true);
    const res = await fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm(f => ({ ...f, title: '', body: '', systemId: '' }));
      load();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (status === 'DISMISSED') setSignals(prev => prev.filter(s => s.id !== id));
  }

  async function assignSystem(id: string, systemId: string) {
    await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId: systemId || null }),
    });
    const sys = systems.find(s => s.id === systemId) ?? null;
    setSignals(prev => prev.map(s => s.id === id ? { ...s, systemId, system: sys } : s));
  }

  async function triageWithNova(id: string) {
    setTriaging(id);
    const res = await fetch('/api/signals/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId: id }),
    });
    const data = await res.json();
    if (data.signal) {
      setSignals(prev => prev.map(s =>
        s.id === id
          ? { ...s, status: data.signal.status, system: data.signal.system, systemId: data.signal.system?.id ?? s.systemId, novaTriaged: true, novaRouting: data.routing }
          : s
      ));
    }
    setTriaging(null);
  }

  async function markRead(id: string) {
    const sig = signals.find(s => s.id === id);
    if (sig?.status === 'UNREAD') updateStatus(id, 'READ');
  }

  // Derive integration layers from signals — source = "integration:<provider>"
  // auto-creates a toggleable layer. No registry bookkeeping.
  const integrationSources = Array.from(
    new Set(
      signals
        .map(s => s.source)
        .filter((src): src is string => typeof src === 'string' && src.startsWith('integration:'))
    ),
  ).sort();

  // Resolve which internal-layer id (if any) this signal belongs to,
  // so a "Manual" hidden toggle filters every user-created signal at
  // once, not just the one whose raw source string matches.
  function internalLayerOf(source: string): string | null {
    if (source.startsWith('integration:')) return null;
    for (const layer of INTERNAL_SOURCES) if (layer.match(source)) return layer.id;
    return null;
  }

  const filtered = signals.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (priorityFilter && s.priority !== priorityFilter) return false;
    // External integrations are keyed by their full source string
    // ("integration:notion"); internal signals are keyed by layer id
    // ("internal:manual", …) so the sidebar can toggle a whole class.
    if (s.source.startsWith('integration:')) {
      if (hiddenSources.has(s.source)) return false;
    } else {
      const layerId = internalLayerOf(s.source);
      if (layerId && hiddenSources.has(layerId)) return false;
    }
    return true;
  });

  // Internal source categories. Each one is a toggleable layer in
  // the sidebar — hiding "manual" hides all user-created signals,
  // hiding "nova" hides everything Nova produced, etc. The key is
  // matched loosely against signal.source to survive naming drift.
  const INTERNAL_SOURCES: { id: string; label: string; match: (src: string) => boolean; color: string }[] = [
    { id: 'internal:manual', label: 'Manual', match: s => s === 'manual', color: '#7193ED' },
    { id: 'internal:nova', label: 'Nova', match: s => s === 'nova', color: '#BF9FF1' },
    { id: 'internal:workflow', label: 'Workflows', match: s => s === 'workflow' || s === 'scheduler', color: '#15AD70' },
    { id: 'internal:system', label: 'System', match: s => !['manual', 'nova', 'workflow', 'scheduler'].includes(s) && !s.startsWith('integration:'), color: 'rgba(255,255,255,0.4)' },
  ];

  // Count signals per layer so the sidebar can show "Manual · 12".
  // Done once per signal list change; cheap O(n × layers).
  const sourceCounts = signals.reduce<Record<string, number>>((acc, s) => {
    for (const layer of INTERNAL_SOURCES) {
      if (layer.match(s.source)) {
        acc[layer.id] = (acc[layer.id] ?? 0) + 1;
        break;
      }
    }
    if (s.source.startsWith('integration:')) {
      acc[s.source] = (acc[s.source] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="flex gap-6 px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* ── Main inbox column ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Inbox</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Incoming updates and notifications · {unreadCount > 0 ? `${unreadCount} unread` : 'all clear'}
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="text-xs font-light px-3 py-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          + New signal
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 p-5 rounded-xl space-y-4"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NEW SIGNAL</p>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Signal title or task description"
            className="w-full text-sm font-light px-3 py-2.5 rounded-lg focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            autoFocus
          />
          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Additional context (optional)"
            rows={3}
            className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                  <option key={p} value={p} style={{ background: '#111' }}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Environment</label>
              <select value={form.environmentId} onChange={e => setForm(f => ({ ...f, environmentId: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                {environments.map(e => (
                  <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Assign to system</label>
              <select value={form.systemId} onChange={e => setForm(f => ({ ...f, systemId: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                <option value="" style={{ background: '#111' }}>— Unassigned —</option>
                {systems.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!form.title || !form.environmentId || saving}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
              {saving ? '···' : 'Add signal'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {['', 'UNREAD', 'TRIAGED', 'READ'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{
              background: statusFilter === s ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusFilter === s ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
              color: statusFilter === s ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
            }}>
            {s || 'All'}
          </button>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
        {['', 'URGENT', 'HIGH'].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{
              background: priorityFilter === p ? (p ? `${PRIORITY_COLOR[p]}15` : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.04)',
              border: `1px solid ${priorityFilter === p ? (p ? `${PRIORITY_COLOR[p]}40` : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.07)'}`,
              color: priorityFilter === p ? (p ? PRIORITY_COLOR[p] : 'rgba(255,255,255,0.8)') : 'rgba(255,255,255,0.35)',
            }}>
            {p || 'All priorities'}
          </button>
        ))}
      </div>

      {/* Signal list — integration toggles moved to the sidebar on the right,
          mirroring the Calendar's layer panel so the two surfaces stay
          conceptually aligned. */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V10.5C13.5 11.05 13.05 11.5 12.5 11.5H2.5C1.95 11.5 1.5 11.05 1.5 10.5V4.5Z" stroke="#BF9FF1" strokeWidth="1.1"/><path d="M1.5 5L7.5 8.5L13.5 5" stroke="#BF9FF1" strokeWidth="1.1" strokeLinecap="round"/></svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>Your inbox is clear</p>
          <p className="text-xs mb-4 max-w-xs text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Incoming signals appear here — from connected integrations, scheduled automations, or manual entries. Nova can auto-triage them for you.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-light px-4 py-2 rounded-lg"
            style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.15)', color: '#BF9FF1' }}>
            + Create a signal
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(signal => (
            <div key={signal.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: signal.status === 'UNREAD' ? PRIORITY_BG[signal.priority] : 'var(--glass)',
                border: `1px solid ${signal.status === 'UNREAD' && signal.priority !== 'NORMAL' ? PRIORITY_COLOR[signal.priority] + '30' : 'var(--glass-border)'}`,
              }}>
              {/* Main row */}
              <div
                className="flex items-start gap-4 px-5 py-3.5 cursor-pointer"
                onClick={() => { setExpanded(expanded === signal.id ? null : signal.id); markRead(signal.id); }}
              >
                {/* Priority dot */}
                <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: PRIORITY_COLOR[signal.priority] }} />
                  <span className="text-xs w-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {SOURCE_ICON[signal.source] ?? '·'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-light truncate"
                      style={{ color: signal.status === 'UNREAD' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                      {signal.title}
                    </p>
                    {signal.status === 'UNREAD' && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#BF9FF1' }} />
                    )}
                  </div>
                  {signal.system && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: signal.system.color ?? 'rgba(255,255,255,0.3)' }} />
                      {signal.system.name}
                      {signal.workflow && ` · ${signal.workflow.name}`}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {signal.novaTriaged && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(21,173,112,0.08)', color: '#15AD70', border: '1px solid rgba(21,173,112,0.15)' }}>
                      ✓ triaged
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(signal.createdAt)}</span>
                  <span className="text-xs font-light"
                    style={{ color: STATUS_COLOR[signal.status] ?? 'rgba(255,255,255,0.3)' }}>
                    {signal.status.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Expanded panel */}
              {expanded === signal.id && (
                <div className="px-5 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  {signal.body && (
                    <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {signal.body}
                    </p>
                  )}

                  {/* Nova routing info */}
                  {signal.novaRouting && (
                    <div className="px-3 py-2 rounded-lg text-xs"
                      style={{ background: 'rgba(21,173,112,0.05)', border: '1px solid rgba(21,173,112,0.15)' }}>
                      <span style={{ color: '#15AD70' }}>Nova: </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{signal.novaRouting.reasoning}</span>
                      <span className="ml-2 text-xs" style={{ color: 'rgba(21,173,112,0.5)' }}>
                        {Math.round((signal.novaRouting.confidence ?? 0) * 100)}% confidence
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Route to system */}
                    <select
                      value={signal.systemId ?? ''}
                      onChange={e => assignSystem(signal.id, e.target.value)}
                      className="text-xs font-light px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
                      <option value="" style={{ background: '#111' }}>— Route to system —</option>
                      {systems.map(s => (
                        <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>
                      ))}
                    </select>

                    {/* Nova triage */}
                    {!signal.novaTriaged && process.env.NODE_ENV !== 'test' && (
                      <button onClick={() => triageWithNova(signal.id)} disabled={triaging === signal.id}
                        className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
                        {triaging === signal.id ? '···' : '⚡ Ask Nova to triage'}
                      </button>
                    )}

                    {/* Convert to workflow run */}
                    {signal.system && (
                      <Link href={`/systems/${signal.system.id}`}
                        className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.4)' }}>
                        Open system →
                      </Link>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      {signal.status !== 'READ' && (
                        <button onClick={() => updateStatus(signal.id, 'READ')}
                          className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Mark read
                        </button>
                      )}
                      <button onClick={() => updateStatus(signal.id, 'DISMISSED')}
                        className="text-xs font-light" style={{ color: 'rgba(255,107,107,0.35)' }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {/* ── Layer sidebar ──────────────────────────────────────────
          Same pattern as /calendar. "Sources" toggles the four
          internal categories (Manual / Nova / Workflows / System).
          "Synced" lists every connected integration that has
          produced a signal so the user can hide/show them as a
          unit. Counts update live as signals arrive.
          ──────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 hidden lg:block">
        <div
          className="sticky top-8 rounded-2xl p-4"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          role="region"
          aria-label="Inbox sources"
        >
          <h3 className="text-[10px] font-light tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--text-3)' }}>
            Sources
          </h3>
          <div className="space-y-1 mb-4">
            {INTERNAL_SOURCES.map(layer => {
              const hidden = hiddenSources.has(layer.id);
              const count = sourceCounts[layer.id] ?? 0;
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleSource(layer.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left"
                  aria-pressed={!hidden}
                  style={{ opacity: hidden ? 0.35 : 1 }}
                >
                  <div
                    className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      background: hidden ? 'transparent' : layer.color,
                      border: `1.5px solid ${layer.color}`,
                    }}
                  >
                    {!hidden && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M1.5 4l2 2 3-3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-light flex-1" style={{ color: 'var(--text-2)' }}>{layer.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {integrationSources.length > 0 && (
            <>
              <h3 className="text-[10px] font-light tracking-[0.16em] uppercase mb-2 mt-4" style={{ color: 'var(--text-3)' }}>
                Synced
              </h3>
              <div className="space-y-1 mb-4">
                {integrationSources.map(src => {
                  const provider = src.split(':').slice(1).join(':');
                  const pretty = provider
                    .replace(/[_-]/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                  const hidden = hiddenSources.has(src);
                  const count = sourceCounts[src] ?? 0;
                  const color = '#7193ED';
                  return (
                    <button
                      key={src}
                      onClick={() => toggleSource(src)}
                      aria-pressed={!hidden}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left"
                      style={{ opacity: hidden ? 0.35 : 1 }}
                    >
                      <div
                        className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: hidden ? 'transparent' : color,
                          border: `1.5px solid ${color}`,
                        }}
                      >
                        {!hidden && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                            <path d="M1.5 4l2 2 3-3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-light truncate flex-1" style={{ color: 'var(--text-2)' }}>{pretty}</span>
                      {count > 0 && (
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <a
            href="/integrations"
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left mt-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
              <path d="M6 1v10M1 6h10" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>Add integration</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
