'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Goal = {
  id: string;
  title: string;
  description: string | null;
  metric: string | null;
  target: string | null;
  current: string | null;
  status: string;
  progress: number | null;
  dueDate: string | null;
  systemId: string;
  system: { id: string; name: string; color: string | null };
  createdAt: string;
  updatedAt: string;
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  ON_TRACK:  { color: '#15AD70', label: 'On track',  bg: 'rgba(21,173,112,0.08)' },
  AT_RISK:   { color: '#F7C700', label: 'At risk',   bg: 'rgba(247,199,0,0.08)' },
  BEHIND:    { color: '#FF6B6B', label: 'Behind',    bg: 'rgba(255,107,107,0.08)' },
  ACHIEVED:  { color: '#7193ED', label: 'Achieved',  bg: 'rgba(113,147,237,0.08)' },
  CANCELLED: { color: 'rgba(255,255,255,0.2)', label: 'Cancelled', bg: 'rgba(255,255,255,0.04)' },
};

const STATUSES = Object.keys(STATUS_META);

function ProgressBar({ progress, status }: { progress: number | null; status: string }) {
  if (progress === null || progress === undefined) return null;
  const color = STATUS_META[status]?.color ?? '#15AD70';
  return (
    <div className="h-0.5 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }} />
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [systems, setSystems] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(d => { setGoals(d); setLoaded(true); });
  }, []);

  useEffect(() => {
    load();
    fetch('/api/systems').then(r => r.json()).then(setSystems).catch(() => {});
    fetch('/api/environments').then(r => r.json()).then(setEnvironments).catch(() => {});
  }, [load]);

  const filtered = goals.filter(g => !statusFilter || g.status === statusFilter);

  const byStatus: Record<string, Goal[]> = {};
  for (const g of filtered) {
    if (!byStatus[g.status]) byStatus[g.status] = [];
    byStatus[g.status].push(g);
  }

  const statusOrder = ['BEHIND', 'AT_RISK', 'ON_TRACK', 'ACHIEVED', 'CANCELLED'];
  const orderedStatuses = statusOrder.filter(s => byStatus[s]?.length > 0);

  const summary = {
    total: goals.length,
    onTrack: goals.filter(g => g.status === 'ON_TRACK').length,
    atRisk: goals.filter(g => g.status === 'AT_RISK').length,
    behind: goals.filter(g => g.status === 'BEHIND').length,
    achieved: goals.filter(g => g.status === 'ACHIEVED').length,
  };

  function daysUntil(iso: string | null) {
    if (!iso) return null;
    const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (d < 0) return 'overdue';
    if (d === 0) return 'today';
    return `${d}d left`;
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  }

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Goals</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded
              ? `${summary.total} goal${summary.total !== 1 ? 's' : ''} across ${systems.length} system${systems.length !== 1 ? 's' : ''}`
              : 'Loading···'}
          </p>
        </div>
      </div>

      {/* Summary row */}
      {loaded && summary.total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'On track', value: summary.onTrack,  color: '#15AD70', filter: 'ON_TRACK' },
            { label: 'At risk',  value: summary.atRisk,   color: '#F7C700', filter: 'AT_RISK' },
            { label: 'Behind',   value: summary.behind,   color: '#FF6B6B', filter: 'BEHIND' },
            { label: 'Achieved', value: summary.achieved, color: '#7193ED', filter: 'ACHIEVED' },
          ].map(s => (
            <button key={s.label} onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
              className="px-5 py-4 rounded-xl text-left transition-all"
              style={{
                background: statusFilter === s.filter ? `${s.color}10` : 'var(--glass)',
                border: `1px solid ${statusFilter === s.filter ? `${s.color}35` : 'var(--glass-border)'}`,
              }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>{s.label}</p>
              <p className="text-2xl font-extralight" style={{ color: s.color }}>{s.value}</p>
            </button>
          ))}
        </div>
      )}

      {/* Goals content */}
      {!loaded ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No goals yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Add goals to systems to track OKR-style progress
          </p>
          <Link href="/systems"
            className="text-xs font-light px-4 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            Go to Systems →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {(statusFilter ? [statusFilter] : orderedStatuses).map(status => {
            const groupGoals = byStatus[status] ?? [];
            if (!groupGoals.length) return null;
            const meta = STATUS_META[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs tracking-[0.1em]" style={{ color: meta.color }}>{meta.label.toUpperCase()}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                    {groupGoals.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupGoals.map(goal => (
                    <div key={goal.id} className="px-5 py-4 rounded-xl"
                      style={{ background: 'var(--glass)', border: `1px solid ${meta.color}18` }}>
                      <div className="flex items-start gap-4">
                        {/* System dot */}
                        <div className="flex-shrink-0 mt-1">
                          <Link href={`/systems/${goal.systemId}`}>
                            <span className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: goal.system.color ?? 'rgba(255,255,255,0.3)' }} />
                          </Link>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.85)' }}>
                              {goal.title}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {goal.dueDate && (
                                <span className="text-xs"
                                  style={{ color: daysUntil(goal.dueDate) === 'overdue' ? '#FF6B6B' : 'rgba(255,255,255,0.25)' }}>
                                  {daysUntil(goal.dueDate)}
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded"
                                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                                {meta.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Link href={`/systems/${goal.systemId}`}
                              className="text-xs transition-colors hover:text-white/50"
                              style={{ color: 'var(--text-3)' }}>
                              {goal.system.name}
                            </Link>
                            {goal.metric && (
                              <>
                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  {goal.metric}
                                  {goal.target && <span style={{ color: 'rgba(255,255,255,0.2)' }}> → {goal.target}</span>}
                                  {goal.current && <span style={{ color: meta.color }}> ({goal.current})</span>}
                                </span>
                              </>
                            )}
                          </div>

                          <ProgressBar progress={goal.progress} status={goal.status} />
                        </div>

                        {/* Quick status change */}
                        <div className="flex-shrink-0">
                          <select
                            value={goal.status}
                            onChange={e => setStatus(goal.id, e.target.value)}
                            className="text-xs font-light px-2 py-1 rounded-lg focus:outline-none appearance-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
                            {STATUSES.map(s => (
                              <option key={s} value={s} style={{ background: '#111' }}>
                                {STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
