'use client';

import { useEffect, useState } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';
import Link from 'next/link';

type Goal = {
  id: string;
  title: string;
  status: string;
  progress: number | null;
  target: string | null;
  current: string | null;
  metric: string | null;
  dueDate: string | null;
  systemName: string;
  systemColor: string | null;
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  ON_TRACK:  { color: '#C8F26B', label: 'On track',  bg: 'rgba(200,242,107,0.08)' },
  AT_RISK:   { color: '#F7C700', label: 'At risk',   bg: 'rgba(247,199,0,0.08)' },
  BEHIND:    { color: '#FF6B6B', label: 'Behind',    bg: 'rgba(255,107,107,0.08)' },
  ACHIEVED:  { color: '#7193ED', label: 'Achieved',  bg: 'rgba(113,147,237,0.08)' },
  CANCELLED: { color: 'rgba(255,255,255,0.2)', label: 'Cancelled', bg: 'rgba(255,255,255,0.04)' },
};

function ProgressBar({ progress, status }: { progress: number | null; status: string }) {
  if (progress === null || progress === undefined) return null;
  const color = STATUS_META[status]?.color ?? '#C8F26B';
  return (
    <div className="h-0.5 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }} />
    </div>
  );
}

export default function EnvironmentGoals() {
  const { slug } = useEnvironmentWorkspace();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch(`/api/environments/${slug}/dashboard`)
      .then(r => r.json())
      .then(d => { setGoals(d.goals ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const filtered = goals.filter(g => !statusFilter || g.status === statusFilter);

  const summary = {
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

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(113,147,237,0.08)', border: '1px solid rgba(113,147,237,0.15)' }}>
          <svg width="18" height="18" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="#7193ED" strokeWidth="1.1" />
            <circle cx="7.5" cy="7.5" r="2.5" stroke="#7193ED" strokeWidth="1.1" />
          </svg>
        </div>
        <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No goals in this environment</p>
        <p className="text-xs max-w-xs text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Create goals on your systems to track measurable outcomes here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'On track', value: summary.onTrack, color: '#C8F26B', filter: 'ON_TRACK' },
          { label: 'At risk', value: summary.atRisk, color: '#F7C700', filter: 'AT_RISK' },
          { label: 'Behind', value: summary.behind, color: '#FF6B6B', filter: 'BEHIND' },
          { label: 'Achieved', value: summary.achieved, color: '#7193ED', filter: 'ACHIEVED' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
            className="px-5 py-4 rounded-xl text-left transition-all"
            style={{
              background: statusFilter === s.filter ? `${s.color}10` : 'var(--glass)',
              border: `1px solid ${statusFilter === s.filter ? `${s.color}35` : 'var(--glass-border)'}`,
            }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            <p className="text-2xl font-extralight" style={{ color: s.color }}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Goal cards */}
      <div className="space-y-2">
        {filtered.map(goal => {
          const meta = STATUS_META[goal.status] ?? STATUS_META.ON_TRACK;
          return (
            <div
              key={goal.id}
              className="px-5 py-4 rounded-xl transition-all"
              style={{
                background: 'var(--glass)',
                border: `1px solid ${meta.color}18`,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: goal.systemColor ?? 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{goal.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {goal.dueDate && (
                        <span className="text-xs"
                          style={{ color: daysUntil(goal.dueDate) === 'overdue' ? '#FF6B6B' : 'var(--text-3)' }}>
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
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{goal.systemName}</span>
                    {goal.metric && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {goal.metric}
                          {goal.target && <span style={{ color: 'var(--text-3)' }}> / {goal.target}</span>}
                          {goal.current && <span style={{ color: meta.color }}> ({goal.current})</span>}
                        </span>
                      </>
                    )}
                  </div>
                  <ProgressBar progress={goal.progress} status={goal.status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
