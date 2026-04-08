'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#15AD70',
  DRAFT: 'rgba(255,255,255,0.3)',
  PAUSED: '#F7C700',
  COMPLETED: '#7193ED',
  ARCHIVED: 'rgba(255,255,255,0.15)',
};

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stages: string[];
  systemId: string;
  systemName: string;
  environmentName: string;
  executions: number;
  updatedAt: string;
};

type Template = {
  id: string;
  name: string;
  description: string;
  stages: string[];
  category: string;
  color: string;
};

type System = { id: string; name: string; environmentId: string };
type Environment = { id: string; name: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSystemId, setCreateSystemId] = useState('');
  const [createEnvId, setCreateEnvId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/workflows').then(r => r.json()),
      fetch('/api/workflows/templates').then(r => r.json()),
      fetch('/api/systems').then(r => r.json()).catch(() => []),
      fetch('/api/environments').then(r => r.json()).catch(() => []),
    ]).then(([wf, tmpl, sys, envs]) => {
      setWorkflows(wf);
      setTemplates(tmpl);
      setSystems(sys);
      setEnvironments(envs);
      if (sys.length > 0) { setCreateSystemId(sys[0].id); setCreateEnvId(sys[0].environmentId); }
      setLoaded(true);
    });
  }, []);

  const filtered = workflows.filter(w => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (systemFilter && w.systemId !== systemFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return w.name.toLowerCase().includes(q) || (w.description ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createSystemId || !createEnvId) return;
    setCreating(true);
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim(), systemId: createSystemId, environmentId: createEnvId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workflows/${data.id}`);
    }
    setCreating(false);
  }

  async function handleTemplateCreate(template: Template) {
    if (!createSystemId || !createEnvId) return;
    setCreating(true);
    const res = await fetch('/api/workflows/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, systemId: createSystemId, environmentId: createEnvId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workflows/${data.id}`);
    }
    setCreating(false);
  }

  const STATUSES = ['ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Workflows</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded ? `${filtered.length} of ${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}` : 'Loading···'}
          </p>
        </div>
        {systems.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowTemplates(true); setShowCreate(false); }}
              className="text-xs font-light px-3 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
              From template
            </button>
            <button onClick={() => { setShowCreate(true); setShowTemplates(false); }}
              className="text-xs font-light px-3 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              + New workflow
            </button>
          </div>
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
              placeholder="Workflow name"
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>System</label>
            <select value={createSystemId}
              onChange={e => {
                setCreateSystemId(e.target.value);
                const sys = systems.find(s => s.id === e.target.value);
                if (sys) setCreateEnvId(sys.environmentId);
              }}
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)', minWidth: '160px' }}>
              {systems.map(s => <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={!createName.trim() || creating}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.25)', color: '#15AD70' }}>
            {creating ? '···' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)}
            className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
        </form>
      )}

      {/* Template picker */}
      {showTemplates && (
        <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid rgba(191,159,241,0.2)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>WORKFLOW TEMPLATES</p>
            <div className="flex items-center gap-3">
              <div>
                <select value={createSystemId}
                  onChange={e => {
                    setCreateSystemId(e.target.value);
                    const sys = systems.find(s => s.id === e.target.value);
                    if (sys) setCreateEnvId(sys.environmentId);
                  }}
                  className="text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.6)' }}>
                  {systems.map(s => <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={() => setShowTemplates(false)}
                className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Close</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {templates.map(t => (
              <button key={t.id} onClick={() => handleTemplateCreate(t)} disabled={creating || !createSystemId}
                className="text-left p-4 rounded-xl transition-all group disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{t.category}</span>
                </div>
                <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {t.name}
                </p>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.stages.slice(0, 4).map((s, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                      {s}
                    </span>
                  ))}
                  {t.stages.length > 4 && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      +{t.stages.length - 4}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {loaded && workflows.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
              <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search workflows···"
              className="text-sm font-light pl-8 pr-4 py-2 rounded-lg focus:outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white', width: '200px' }} />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['', ...STATUSES].map(s => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                className="text-xs font-light px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                style={{
                  background: statusFilter === s ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${statusFilter === s ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  color: s ? (STATUS_COLOR[s] ?? 'rgba(255,255,255,0.4)') : statusFilter === '' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                }}>
                {s ? s.toLowerCase() : 'all'}
              </button>
            ))}
          </div>

          {/* System filter */}
          {systems.length > 1 && (
            <select value={systemFilter} onChange={e => setSystemFilter(e.target.value)}
              className="text-xs font-light px-3 py-2 rounded-lg focus:outline-none appearance-none ml-auto"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
              <option value="" style={{ background: '#111' }}>All systems</option>
              {systems.map(s => <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No systems yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Workflows operate within systems</p>
          <Link href="/systems" className="text-xs font-light px-4 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            Create a system →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            {workflows.length === 0 ? 'No workflows yet' : 'No matches'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            {workflows.length === 0 ? 'Create one or use a template to get started' : 'Try adjusting your filters'}
          </p>
          {workflows.length === 0 && (
            <button onClick={() => setShowTemplates(true)}
              className="text-xs font-light px-4 py-2 rounded-lg"
              style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
              Browse templates →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(w => (
            <div key={w.id} className="group flex flex-col rounded-xl transition-all"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <Link href={`/workflows/${w.id}`} className="flex flex-col p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: STATUS_COLOR[w.status] ?? 'rgba(255,255,255,0.2)' }} />
                  <div className="flex items-center gap-2">
                    {w.stages.length > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{w.stages.length} stages</span>
                    )}
                    <span className="text-xs font-light" style={{ color: STATUS_COLOR[w.status] ?? 'rgba(255,255,255,0.3)' }}>
                      {w.status.toLowerCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {w.name}
                </p>
                {w.description && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-3)' }}>{w.description}</p>
                )}
                {w.stages.length > 0 && (
                  <div className="flex items-center gap-1 mt-3 overflow-hidden">
                    {w.stages.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 max-w-[80px] truncate"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>
                        {s}
                      </span>
                    ))}
                    {w.stages.length > 3 && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>+{w.stages.length - 3}</span>
                    )}
                  </div>
                )}
              </Link>
              <div className="flex items-center justify-between px-5 pb-4 pt-1 gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-xs truncate min-w-0 flex-shrink" style={{ color: 'var(--text-3)' }}>{w.systemName}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {w.executions > 0 && (
                    <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.2)' }}>{w.executions} {w.executions === 1 ? 'run' : 'runs'}</span>
                  )}
                  <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.15)' }}>{timeAgo(w.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
