'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Automation = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  systemId: string;
  systemName: string;
  systemColor: string | null;
  schedule: string;
  scheduleLabel: string;
  workflowId: string | null;
  input: string;
  nextRun: string | null;
  lastRun: string | null;
  lastSuccess: boolean | null;
};

type System = { id: string; name: string; environmentId: string };
type Workflow = { id: string; name: string; systemId: string };

const SCHEDULES = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Every day at 9am' },
  { value: 'weekdays', label: 'Weekdays at 9am' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'overdue';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ name: '', systemId: '', workflowId: '', schedule: 'daily', input: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/automations').then(r => r.json()),
      fetch('/api/systems').then(r => r.json()),
      fetch('/api/workflows').then(r => r.json()),
    ]).then(([auto, sys, wf]) => {
      setAutomations(auto);
      setSystems(sys);
      setWorkflows(wf);
      if (sys.length > 0) setForm(f => ({ ...f, systemId: sys[0].id }));
      setLoaded(true);
    });
  }, []);

  const systemWorkflows = workflows.filter(w => w.systemId === form.systemId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.systemId) return;
    const sys = systems.find(s => s.id === form.systemId);
    await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, environmentId: sys?.environmentId }),
    });
    const updated = await fetch('/api/automations').then(r => r.json());
    setAutomations(updated);
    setShowCreate(false);
    setForm({ name: '', systemId: systems[0]?.id ?? '', workflowId: '', schedule: 'daily', input: '' });
  }

  async function triggerNow(id: string) {
    setTriggering(id);
    await fetch(`/api/automations/${id}/trigger`, { method: 'POST' });
    const updated = await fetch('/api/automations').then(r => r.json());
    setAutomations(updated);
    setTriggering(null);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: !current } : a));
  }

  async function deleteAutomation(id: string) {
    await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    setAutomations(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="px-10 py-10 min-h-screen">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Automations</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded ? `${automations.filter(a => a.isActive).length} active · ${automations.length} total` : 'Loading···'}
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="text-xs font-light px-3 py-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          + New automation
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 p-5 rounded-xl space-y-4"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NEW AUTOMATION</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Weekly content brief"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Schedule</label>
              <select value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                {SCHEDULES.map(s => <option key={s.value} value={s.value} style={{ background: '#111' }}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>System</label>
              <select value={form.systemId} onChange={e => setForm(f => ({ ...f, systemId: e.target.value, workflowId: '' }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                {systems.map(s => <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Workflow (optional)</label>
              <select value={form.workflowId} onChange={e => setForm(f => ({ ...f, workflowId: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                <option value="" style={{ background: '#111' }}>None (free-form)</option>
                {systemWorkflows.map(w => <option key={w.id} value={w.id} style={{ background: '#111' }}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Input / instructions</label>
            <textarea value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))}
              placeholder="What should this automation do each time it runs? Be specific."
              rows={3}
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!form.name || !form.systemId}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.25)', color: '#15AD70' }}>
              Create automation
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {!loaded ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 7v5l3 3"/>
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No automations yet</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Schedule workflows to run automatically</p>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-light px-4 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
            Create your first automation →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{ background: 'var(--glass)', border: `1px solid ${a.isActive ? 'var(--glass-border)' : 'rgba(255,255,255,0.04)'}`, opacity: a.isActive ? 1 : 0.5 }}>
              {/* Toggle */}
              <button onClick={() => toggleActive(a.id, a.isActive)}
                className="w-8 h-4 rounded-full flex-shrink-0 relative transition-all"
                style={{ background: a.isActive ? 'rgba(21,173,112,0.3)' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 transition-all w-3 h-3 rounded-full"
                  style={{ left: a.isActive ? '18px' : '2px', background: a.isActive ? '#15AD70' : 'rgba(255,255,255,0.3)' }} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{a.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                    {a.scheduleLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/systems/${a.systemId}`}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: 'var(--text-3)' }}>
                    {a.systemColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.systemColor }} />}
                    {a.systemName}
                  </Link>
                  {a.lastRun && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Last: {timeAgo(a.lastRun)}
                      {a.lastSuccess === false && <span style={{ color: '#FF6B6B' }}> ✕</span>}
                      {a.lastSuccess === true && <span style={{ color: '#15AD70' }}> ✓</span>}
                    </span>
                  )}
                  {a.nextRun && a.isActive && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Next: {timeUntil(a.nextRun)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => triggerNow(a.id)} disabled={triggering === a.id}
                  className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
                  {triggering === a.id ? '···' : '▶ Run now'}
                </button>
                <button onClick={() => deleteAutomation(a.id)}
                  className="text-xs font-light px-2 py-1.5 rounded-lg transition-all"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
