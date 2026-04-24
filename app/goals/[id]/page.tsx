'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ActivityButton from '@/components/ActivityButton';

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
  system: { id: string; name: string; color: string | null } | null;
  environment: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  ON_TRACK:  { color: '#C8F26B', label: 'On track' },
  AT_RISK:   { color: '#F5D76E', label: 'At risk' },
  BEHIND:    { color: '#FF8C69', label: 'Behind' },
  ACHIEVED:  { color: '#7193ED', label: 'Achieved' },
  CANCELLED: { color: 'rgba(255,255,255,0.3)', label: 'Cancelled' },
};

const STATUSES = ['ON_TRACK', 'AT_RISK', 'BEHIND', 'ACHIEVED', 'CANCELLED'];

function daysLabel(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'due today';
  return `${diff}d left`;
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/goals/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Not found');
        return r.json();
      })
      .then(setGoal)
      .catch(e => setError(e.message))
      .finally(() => setLoaded(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patch(body: Record<string, unknown>) {
    if (!goal) return;
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setGoal(g => g ? { ...g, ...updated } : g);
      window.dispatchEvent(new CustomEvent('grid:goal-changed'));
    }
  }

  async function remove() {
    if (!goal) return;
    if (!confirm('Delete this goal?')) return;
    const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('grid:goal-changed'));
      router.push('/goals');
    }
  }

  if (!loaded) {
    return <div className="p-6"><div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} /></div>;
  }

  if (error || !goal) {
    return (
      <div className="p-6">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          {error ?? 'Goal not found.'} <Link href="/goals" className="underline">Back to goals</Link>
        </p>
      </div>
    );
  }

  const meta = STATUS_META[goal.status] ?? STATUS_META.ON_TRACK;
  const pct = Math.round(goal.progress ?? 0);
  const due = daysLabel(goal.dueDate);
  const overdue = goal.dueDate && new Date(goal.dueDate).getTime() < Date.now() && goal.status !== 'ACHIEVED';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={goal.environment ? `/environments/${goal.environment.slug}` : '/goals'}
          className="text-[11px] font-light transition-colors hover:text-white/70"
          style={{ color: 'var(--text-3)' }}
        >
          ← {goal.environment ? goal.environment.name : 'Goals'}
        </Link>
        <div className="flex items-center gap-3">
          <ActivityButton entityType="goal" entityId={goal.id} entityLabel={goal.title} />
          <button
            onClick={remove}
            className="text-[11px] font-light transition-colors hover:text-white/70"
            style={{ color: 'var(--text-3)' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="glass-deep rounded-2xl p-5 md:p-6 animate-fade-in">
        <div className="flex items-start gap-3 mb-4">
          {goal.system && (
            <div className="flex items-center gap-1.5 shrink-0 mt-1">
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: goal.system.color || 'var(--text-3)' }} />
              <Link href={`/systems/${goal.system.id}`} className="text-[10px] tracking-wider uppercase font-light hover:text-white/70"
                style={{ color: 'var(--text-3)' }}>
                {goal.system.name}
              </Link>
            </div>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-extralight leading-tight mb-3"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          {goal.title}
        </h1>
        {goal.description && (
          <p className="text-sm font-light max-w-2xl mb-4" style={{ color: 'var(--text-2)' }}>
            {goal.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, pct)}%`, background: meta.color }} />
          </div>
          <span className="stat-number text-2xl font-extralight tabular-nums shrink-0"
            style={{ color: meta.color, letterSpacing: '-0.02em' }}>
            {pct}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-light"
          style={{ color: 'var(--text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
          {goal.current !== null && goal.target !== null && (
            <span>
              <span style={{ color: 'var(--text-1)' }}>{goal.current}</span>
              {' / '}
              <span style={{ color: 'var(--text-1)' }}>{goal.target}</span>
              {goal.metric && <span> {goal.metric}</span>}
            </span>
          )}
          {due && (
            <span style={{ color: overdue ? '#FF8C69' : 'var(--text-3)' }}>{due}</span>
          )}
        </div>
      </div>

      {/* Edit panel */}
      <div className="glass-deep rounded-2xl p-5">
        <h3 className="text-[10px] tracking-[0.14em] uppercase font-light mb-4" style={{ color: 'var(--text-3)' }}>
          Update {saving && <span className="ml-2">saving…</span>}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progress slider */}
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-2" style={{ color: 'var(--text-3)' }}>
              Progress
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={e => setGoal(g => g ? { ...g, progress: Number(e.target.value) } : g)}
                onMouseUp={e => patch({ progress: Number((e.target as HTMLInputElement).value) })}
                onTouchEnd={e => patch({ progress: Number((e.target as HTMLInputElement).value) })}
                className="flex-1 accent-current"
                style={{ color: meta.color }}
              />
              <span className="tabular-nums text-sm font-light w-10 text-right" style={{ color: 'var(--text-1)' }}>{pct}%</span>
            </div>
          </div>

          {/* Status select */}
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-2" style={{ color: 'var(--text-3)' }}>
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => {
                const active = s === goal.status;
                const c = STATUS_META[s].color;
                return (
                  <button
                    key={s}
                    onClick={() => patch({ status: s })}
                    className="text-[11px] font-light px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: active ? `${c}14` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? c + '55' : 'var(--glass-border)'}`,
                      color: active ? c : 'var(--text-2)',
                    }}
                  >
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current value */}
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-2" style={{ color: 'var(--text-3)' }}>
              Current {goal.metric && `(${goal.metric})`}
            </label>
            <input
              type="text"
              defaultValue={goal.current ?? ''}
              onBlur={e => e.target.value !== (goal.current ?? '') && patch({ current: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>

          {/* Target */}
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-2" style={{ color: 'var(--text-3)' }}>
              Target {goal.metric && `(${goal.metric})`}
            </label>
            <input
              type="text"
              defaultValue={goal.target ?? ''}
              onBlur={e => e.target.value !== (goal.target ?? '') && patch({ target: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
