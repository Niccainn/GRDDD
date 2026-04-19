'use client';

import { useState, useEffect } from 'react';

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
  createdAt: string;
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  ON_TRACK:  { color: '#C8F26B', label: 'On track',  bg: 'rgba(200,242,107,0.08)' },
  AT_RISK:   { color: '#F7C700', label: 'At risk',   bg: 'rgba(247,199,0,0.08)' },
  BEHIND:    { color: '#FF6B6B', label: 'Behind',    bg: 'rgba(255,107,107,0.08)' },
  ACHIEVED:  { color: '#7193ED', label: 'Achieved',  bg: 'rgba(113,147,237,0.08)' },
  CANCELLED: { color: 'rgba(255,255,255,0.2)', label: 'Cancelled', bg: 'rgba(255,255,255,0.04)' },
};

const STATUSES = ['ON_TRACK', 'AT_RISK', 'BEHIND', 'ACHIEVED', 'CANCELLED'];

function ProgressBar({ progress, status }: { progress: number | null; status: string }) {
  if (progress === null) return null;
  const color = STATUS_META[status]?.color ?? '#C8F26B';
  return (
    <div className="h-0.5 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }} />
    </div>
  );
}

export default function SystemGoals({
  systemId,
  environmentId,
}: {
  systemId: string;
  environmentId: string;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', metric: '', target: '', dueDate: '',
  });
  const [editForm, setEditForm] = useState<Partial<Goal & { dueDate: string }>>({});

  useEffect(() => {
    if (!open) return;
    fetch(`/api/goals?systemId=${systemId}`)
      .then(r => r.json())
      .then(d => { setGoals(d); setLoaded(true); });
  }, [systemId, open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, systemId, environmentId }),
    });
    const goal = await res.json();
    setGoals(prev => [goal, ...prev]);
    setForm({ title: '', description: '', metric: '', target: '', dueDate: '' });
    setCreating(false);
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
    setEditingId(null);
    setSaving(false);
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  const activeGoals = goals.filter(g => g.status !== 'CANCELLED' && g.status !== 'ACHIEVED');
  const doneGoals   = goals.filter(g => g.status === 'ACHIEVED' || g.status === 'CANCELLED');

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: 'var(--glass)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: '#F7C700', opacity: 0.8 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>GOALS</span>
          {activeGoals.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(247,199,0,0.1)', color: '#F7C700', border: '1px solid rgba(247,199,0,0.2)' }}>
              {activeGoals.length} active
            </span>
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2" style={{ background: 'rgba(247,199,0,0.02)', borderTop: '1px solid var(--glass-border)' }}>
          {!loaded ? (
            <div className="h-10 rounded-lg animate-pulse mt-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : (
            <>
              {/* Active goals */}
              {activeGoals.length > 0 && (
                <div className="mt-2 space-y-2 mb-3">
                  {activeGoals.map(goal => {
                    const meta = STATUS_META[goal.status] ?? STATUS_META.ON_TRACK;
                    return (
                      <div key={goal.id} className="rounded-lg p-3"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}25` }}>
                        {editingId === goal.id ? (
                          <div className="space-y-2">
                            <input
                              value={editForm.title ?? goal.title}
                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                              className="w-full text-xs font-light px-2 py-1.5 rounded focus:outline-none"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={editForm.current ?? goal.current ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, current: e.target.value }))}
                                placeholder="Current value"
                                className="text-xs font-light px-2 py-1.5 rounded focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                              />
                              <select
                                value={editForm.status ?? goal.status}
                                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                className="text-xs font-light px-2 py-1.5 rounded focus:outline-none appearance-none"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                                {STATUSES.map(s => <option key={s} value={s} style={{ background: '#111' }}>{STATUS_META[s]?.label}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleUpdate(goal.id)} disabled={saving}
                                className="text-xs font-light px-2.5 py-1 rounded transition-all"
                                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color }}>
                                {saving ? '···' : 'Save'}
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-xs font-light"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{goal.title}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                                  {meta.label}
                                </span>
                                <button onClick={() => { setEditingId(goal.id); setEditForm({}); }}
                                  className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>✎</button>
                                <button onClick={() => handleDelete(goal.id)}
                                  className="text-xs" style={{ color: 'rgba(255,107,107,0.3)' }}>✕</button>
                              </div>
                            </div>
                            {goal.metric && (
                              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {goal.metric}
                                {goal.target && <span style={{ color: 'rgba(255,255,255,0.25)' }}> · target: {goal.target}</span>}
                                {goal.current && <span style={{ color: meta.color }}> · now: {goal.current}</span>}
                              </p>
                            )}
                            {goal.dueDate && (
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Due {new Date(goal.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                            <ProgressBar progress={goal.progress} status={goal.status} />
                            {/* Quick status buttons */}
                            <div className="flex items-center gap-1.5 mt-2">
                              {STATUSES.filter(s => s !== goal.status && s !== 'CANCELLED').map(s => (
                                <button key={s} onClick={() => setStatus(goal.id, s)}
                                  className="text-xs font-light px-2 py-0.5 rounded transition-all"
                                  style={{ color: `${STATUS_META[s].color}80`, border: `1px solid ${STATUS_META[s].color}20` }}>
                                  {STATUS_META[s].label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Done goals collapsed */}
              {doneGoals.length > 0 && (
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  + {doneGoals.length} completed/cancelled
                </p>
              )}

              {/* Create form */}
              {creating ? (
                <form onSubmit={handleCreate} className="mt-2 space-y-2">
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Goal title (e.g. Publish 4 articles per week)"
                    className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(247,199,0,0.2)', color: 'white' }}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={form.metric}
                      onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                      placeholder="Metric to track"
                      className="text-xs font-light px-2.5 py-1.5 rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
                    />
                    <input
                      value={form.target}
                      onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                      placeholder="Target value"
                      className="text-xs font-light px-2.5 py-1.5 rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
                    />
                  </div>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="text-xs font-light px-2.5 py-1.5 rounded-lg focus:outline-none w-full"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={!form.title.trim() || saving}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{ background: 'rgba(247,199,0,0.1)', border: '1px solid rgba(247,199,0,0.25)', color: '#F7C700' }}>
                      {saving ? '···' : 'Add goal'}
                    </button>
                    <button type="button" onClick={() => setCreating(false)}
                      className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="mt-2 w-full text-xs font-light px-3 py-2 rounded-lg transition-all text-left"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(247,199,0,0.2)',
                    color: 'rgba(247,199,0,0.45)',
                  }}>
                  + Add goal
                </button>
              )}

              {goals.length === 0 && !creating && (
                <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  Goals give Nova direction when evaluating system health
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
