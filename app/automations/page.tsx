'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Automation = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  isActive: boolean;
  environmentId: string;
  environmentName: string;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Environment = { id: string; name: string; slug: string };

const TRIGGER_META: Record<string, { label: string; color: string }> = {
  manual:   { label: 'Manual',   color: '#7193ED' },
  schedule: { label: 'Schedule', color: '#15AD70' },
  webhook:  { label: 'Webhook',  color: '#F7C700' },
  event:    { label: 'Event',    color: '#BF9FF1' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTrigger, setCreateTrigger] = useState('manual');
  const [createEnvId, setCreateEnvId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/automations').then(r => r.json()),
      fetch('/api/environments').then(r => r.json()).catch(() => []),
    ]).then(([auto, envs]) => {
      setAutomations(Array.isArray(auto) ? auto : []);
      setEnvironments(Array.isArray(envs) ? envs : []);
      if (envs.length > 0) setCreateEnvId(envs[0].id);
      setLoaded(true);
    });
  }, []);

  const filtered = automations.filter(a => {
    if (filter === 'active' && !a.isActive) return false;
    if (filter === 'inactive' && a.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: !current } : a));
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createEnvId) return;
    setCreating(true);
    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim(), trigger: createTrigger, environmentId: createEnvId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/automations/${data.id}`);
    }
    setCreating(false);
  }

  const activeCount = automations.filter(a => a.isActive).length;

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Automations</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded ? `${activeCount} active / ${automations.length} total` : 'Loading...'}
          </p>
        </div>
        {environments.length > 0 && (
          <button
            onClick={() => setShowCreate(v => !v)}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            + New automation
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate}
          className="mb-6 p-5 rounded-xl flex items-end gap-3"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex-1">
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Name</label>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="My automation"
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Trigger</label>
            <select value={createTrigger} onChange={e => setCreateTrigger(e.target.value)}
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)', minWidth: '130px' }}>
              <option value="manual" style={{ background: '#111' }}>Manual</option>
              <option value="schedule" style={{ background: '#111' }}>Schedule</option>
              <option value="webhook" style={{ background: '#111' }}>Webhook</option>
              <option value="event" style={{ background: '#111' }}>Event</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Environment</label>
            <select value={createEnvId} onChange={e => setCreateEnvId(e.target.value)}
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)', minWidth: '160px' }}>
              {environments.map(env => <option key={env.id} value={env.id} style={{ background: '#111' }}>{env.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={!createName.trim() || creating}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.25)', color: '#15AD70' }}>
            {creating ? '...' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)}
            className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
        </form>
      )}

      {/* Filters */}
      {loaded && automations.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
              <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search automations..."
              className="text-sm font-light pl-8 pr-4 py-2 rounded-lg focus:outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white', width: '200px' }} />
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${filter === f ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  color: filter === f ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : environments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <path d="M4 12h4m4 0h4m-4-4v8" strokeLinecap="round"/>
              <rect x="2" y="2" width="20" height="20" rx="4"/>
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>Create an environment first</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Automations run inside environments
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2">
              <circle cx="6" cy="6" r="2.5"/>
              <circle cx="18" cy="12" r="2.5"/>
              <circle cx="6" cy="18" r="2.5"/>
              <path d="M8.5 6h4.5a2 2 0 012 2v2" strokeLinecap="round"/>
              <path d="M8.5 18h4.5a2 2 0 002-2v-2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            {automations.length === 0 ? 'Build your first automation' : 'No matches'}
          </p>
          <p className="text-xs mb-5 max-w-xs text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
            {automations.length === 0
              ? 'Create visual workflows with triggers, conditions, and actions that run automatically'
              : 'Try adjusting your search or filters'}
          </p>
          {automations.length === 0 && (
            <button onClick={() => setShowCreate(true)}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              Create automation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(a => {
            const tm = TRIGGER_META[a.trigger] ?? TRIGGER_META.manual;
            return (
              <div key={a.id}
                className="group flex flex-col rounded-2xl transition-all cursor-pointer"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
                onClick={() => router.push(`/automations/${a.id}`)}>
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${tm.color}12`, border: `1px solid ${tm.color}30`, color: tm.color }}>
                        {tm.label}
                      </span>
                      {a.isActive && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#15AD70' }} />
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(a.id, a.isActive); }}
                      className="w-8 h-4 rounded-full flex-shrink-0 relative transition-all"
                      style={{ background: a.isActive ? 'rgba(21,173,112,0.3)' : 'rgba(255,255,255,0.1)' }}>
                      <span className="absolute top-0.5 transition-all w-3 h-3 rounded-full"
                        style={{ left: a.isActive ? '18px' : '2px', background: a.isActive ? '#15AD70' : 'rgba(255,255,255,0.3)' }} />
                    </button>
                  </div>
                  <p className="text-sm font-light mb-1 group-hover:text-white transition-colors"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {a.name}
                  </p>
                  {a.description && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-3)' }}>
                      {a.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between px-5 pb-4 pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{a.environmentName}</span>
                  <div className="flex items-center gap-3">
                    {a.runCount > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {a.runCount} {a.runCount === 1 ? 'run' : 'runs'}
                      </span>
                    )}
                    {a.lastRunAt && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
                        {timeAgo(a.lastRunAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
