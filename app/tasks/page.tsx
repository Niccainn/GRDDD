'use client';

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import SampleDataBanner from '@/components/SampleDataBanner';

type TaskUser = { id: string; name: string; avatar: string | null };
type TaskSystem = { id: string; name: string; color: string | null };
type TaskEnv = { id: string; name: string; color: string | null };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  labels: string | null;
  parentId: string | null;
  createdAt: string;
  creator: TaskUser;
  assignee: TaskUser | null;
  system: TaskSystem | null;
  environment: TaskEnv;
  _count: { subtasks: number; comments: number };
};

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const;

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: 'rgba(255,255,255,0.2)', TODO: '#7193ED', IN_PROGRESS: '#BF9FF1', REVIEW: '#F7C700', DONE: '#C8F26B', CANCELLED: 'rgba(255,255,255,0.15)',
};
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#FF5757', HIGH: '#F7C700', NORMAL: 'rgba(255,255,255,0.3)', LOW: 'rgba(255,255,255,0.15)',
};
const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent', HIGH: 'High', NORMAL: 'Normal', LOW: 'Low',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `${d}d left`;
}

function Initials({ name, size = 24 }: { name: string; size?: number }) {
  const i = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--brand-glow)', color: 'var(--brand)', border: '1px solid var(--brand-border)', fontSize: size * 0.4 }}>
      {i}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type View = 'list' | 'table';

function TasksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast: addToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>('list');
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState('TODO');

  // Filters from URL
  const envFilter = searchParams.get('environment') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const priorityFilter = searchParams.get('priority') ?? '';

  // Search
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);
  const searchRef = useRef<HTMLInputElement>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  // Create form
  const [form, setForm] = useState({ title: '', description: '', priority: 'NORMAL', environmentId: '', systemId: '', assigneeId: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  // Helper to update URL params
  const updateUrlParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (envFilter) params.set('environmentId', envFilter);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/tasks?${params}`)
      .then(r => r.json())
      .then(d => { setTasks(d.tasks); setCounts(d.counts); setLoaded(true); });
  }, [envFilter, statusFilter]);

  useEffect(() => {
    load();
    fetch('/api/environments').then(r => r.json()).then(envs => {
      setEnvironments(envs);
      if (envs.length > 0 && !form.environmentId) setForm(f => ({ ...f, environmentId: envs[0].id }));
    }).catch(() => {});
    fetch('/api/team').then(r => r.json()).then(d => setMembers(d.members ?? d ?? [])).catch(() => {});
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter tasks client-side by search + priority
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }
    return result;
  }, [tasks, debouncedSearch, priorityFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, statusFilter, priorityFilter, envFilter]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.environmentId) return;
    setSaving(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        status: createStatus,
        dueDate: form.dueDate || undefined,
        assigneeId: form.assigneeId || undefined,
        systemId: form.systemId || undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm(f => ({ ...f, title: '', description: '', dueDate: '' }));
      load();
    }
    setSaving(false);
  }

  async function updateTask(id: string, data: Record<string, unknown>) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data as Partial<Task> } : t));
  }

  // Bulk actions
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(t => t.id)));
    }
  }

  async function bulkUpdateStatus(status: string) {
    setBulkAction(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        )
      );
      addToast(`Updated ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''} to ${STATUS_LABEL[status]}`, 'success');
      setSelectedIds(new Set());
      load();
    } catch {
      addToast('Failed to update tasks', 'error');
    }
    setBulkAction(false);
  }

  async function bulkUpdatePriority(priority: string) {
    setBulkAction(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority }),
          })
        )
      );
      addToast(`Updated ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''} to ${PRIORITY_LABEL[priority]}`, 'success');
      setSelectedIds(new Set());
      load();
    } catch {
      addToast('Failed to update tasks', 'error');
    }
    setBulkAction(false);
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkAction(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        )
      );
      addToast(`Deleted ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`, 'success');
      setSelectedIds(new Set());
      load();
    } catch {
      addToast('Failed to delete tasks', 'error');
    }
    setBulkAction(false);
  }

  const totalActive = (counts['TODO'] ?? 0) + (counts['IN_PROGRESS'] ?? 0) + (counts['REVIEW'] ?? 0);

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <SampleDataBanner onClear={load} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Tasks</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {totalActive} active · {counts['DONE'] ?? 0} completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            {(['list', 'table'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="text-xs font-light px-3 py-1.5 transition-all flex items-center gap-1.5"
                style={{
                  background: view === v ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                  color: view === v ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                }}>
                {v === 'list' && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
                  </svg>
                )}
                {v === 'table' && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="14" height="14" rx="1.5" /><line x1="1" y1="5" x2="15" y2="5" /><line x1="1" y1="10" x2="15" y2="10" /><line x1="6" y1="1" x2="6" y2="15" />
                  </svg>
                )}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <Link href="/tasks/board"
              className="text-xs font-light px-3 py-1.5 transition-all flex items-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.3)',
              }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="2" width="4" height="12" rx="1" /><rect x="6" y="2" width="4" height="8" rx="1" /><rect x="11" y="2" width="4" height="10" rx="1" />
              </svg>
              Board
            </Link>
          </div>
          <button onClick={() => { setCreateStatus('TODO'); setShowCreate(v => !v); }}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            + New task
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search tasks..."
          className="glass-input w-full text-sm font-light pl-9 pr-8 py-2.5 rounded-lg focus:outline-none"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
        />
        {searchText && (
          <button
            onClick={() => { setSearchText(''); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-all hover:opacity-80"
            style={{ color: 'var(--text-3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <select value={envFilter} onChange={e => updateUrlParam('environment', e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All environments</option>
          {environments.map(e => (
            <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => updateUrlParam('status', e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: statusFilter ? `${STATUS_COLOR[statusFilter] ?? 'rgba(255,255,255,0.04)'}15` : 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: statusFilter ? STATUS_COLOR[statusFilter] ?? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All statuses</option>
          <option value="active" style={{ background: '#111' }}>Active</option>
          {STATUSES.map(s => (
            <option key={s} value={s} style={{ background: '#111' }}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={e => updateUrlParam('priority', e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: priorityFilter ? `${PRIORITY_COLOR[priorityFilter] ?? 'rgba(255,255,255,0.04)'}15` : 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: priorityFilter ? PRIORITY_COLOR[priorityFilter] ?? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All priorities</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p} style={{ background: '#111' }}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        {(statusFilter || priorityFilter || envFilter) && (
          <button
            onClick={() => router.replace('?', { scroll: false })}
            className="text-xs font-light px-2 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--text-3)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createTask} className="mb-6 p-5 rounded-xl space-y-4 animate-fade-in"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NEW TASK</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${STATUS_COLOR[createStatus]}20`, color: STATUS_COLOR[createStatus], border: `1px solid ${STATUS_COLOR[createStatus]}30` }}>
              {STATUS_LABEL[createStatus]}
            </span>
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title" autoFocus
            className="w-full text-sm font-light px-3 py-2.5 rounded-lg focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                {PRIORITIES.map(p => <option key={p} value={p} style={{ background: '#111' }}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Environment</label>
              <select value={form.environmentId} onChange={e => setForm(f => ({ ...f, environmentId: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                {environments.map(e => <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Assignee</label>
              <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)' }}>
                <option value="" style={{ background: '#111' }}>Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Due date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.65)', colorScheme: 'dark' }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!form.title || saving}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
              {saving ? '...' : 'Create task'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Loading */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : view === 'table' ? (
        <TableView tasks={filteredTasks} onUpdate={updateTask} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
      ) : (
        <ListView tasks={filteredTasks} onUpdate={updateTask} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl animate-fade-in"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
          <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5" style={{ background: 'var(--glass-border)' }} />

          {/* Change Status */}
          <select
            value=""
            onChange={e => { if (e.target.value) bulkUpdateStatus(e.target.value); }}
            disabled={bulkAction}
            className="text-xs font-light px-2.5 py-1.5 rounded-lg appearance-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
            <option value="" style={{ background: '#111' }}>Status...</option>
            {STATUSES.map(s => <option key={s} value={s} style={{ background: '#111' }}>{STATUS_LABEL[s]}</option>)}
          </select>

          {/* Change Priority */}
          <select
            value=""
            onChange={e => { if (e.target.value) bulkUpdatePriority(e.target.value); }}
            disabled={bulkAction}
            className="text-xs font-light px-2.5 py-1.5 rounded-lg appearance-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
            <option value="" style={{ background: '#111' }}>Priority...</option>
            {PRIORITIES.map(p => <option key={p} value={p} style={{ background: '#111' }}>{PRIORITY_LABEL[p]}</option>)}
          </select>

          {/* Delete */}
          <button
            onClick={bulkDelete}
            disabled={bulkAction}
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            Delete
          </button>

          {/* Clear selection */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-light px-2 py-1.5 transition-all hover:opacity-80"
            style={{ color: 'var(--text-3)' }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      </div>
    }>
      <TasksPageInner />
    </Suspense>
  );
}

// ────────────────────────────────────────────
// LIST VIEW
// ────────────────────────────────────────────

function ListView({ tasks, onUpdate, selectedIds, onToggleSelect, onToggleSelectAll }: {
  tasks: Task[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < tasks.length;

  return (
    <div className="space-y-1.5">
      {/* Select all header */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected; }}
              onChange={onToggleSelectAll}
              className="w-3.5 h-3.5 rounded accent-[var(--brand)]"
              style={{ accentColor: 'var(--brand)' }}
            />
            <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </label>
        </div>
      )}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No tasks yet</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Create your first task — or let Nova generate them from signals</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full max-w-lg text-left">
            {[
              { label: 'Auto-triage', copy: 'Nova reads signals from connected tools and drafts tasks with priority and system.', color: '#BF9FF1' },
              { label: 'Link to systems', copy: 'Every task ties to a system, so Nova can see bottlenecks across the whole org.', color: '#7193ED' },
              { label: 'Ask Nova', copy: '"What should I do next?" — Nova ranks open tasks by signal weight and deadline.', color: '#C8F26B' },
            ].map(f => (
              <div key={f.label} className="rounded-xl p-3" style={{ background: `${f.color}06`, border: `1px solid ${f.color}18` }}>
                <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-1" style={{ color: f.color }}>{f.label}</p>
                <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>{f.copy}</p>
              </div>
            ))}
          </div>
        </div>
      ) : tasks.map(task => (
        <div key={task.id} className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:scale-[1.002]"
          style={{
            background: selectedIds.has(task.id) ? 'var(--glass-hover)' : 'var(--glass)',
            border: `1px solid ${selectedIds.has(task.id) ? 'var(--brand-border, var(--glass-border))' : 'var(--glass-border)'}`,
          }}>
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selectedIds.has(task.id)}
            onChange={() => onToggleSelect(task.id)}
            className="w-3.5 h-3.5 rounded flex-shrink-0"
            style={{ accentColor: 'var(--brand)' }}
          />

          {/* Status toggle */}
          <button onClick={() => onUpdate(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
            style={{
              border: `1.5px solid ${STATUS_COLOR[task.status]}`,
              background: task.status === 'DONE' ? STATUS_COLOR['DONE'] : 'transparent',
            }}>
            {task.status === 'DONE' && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Priority dot */}
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />

          {/* Title */}
          <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-light truncate" style={{
              color: task.status === 'DONE' ? 'var(--text-3)' : 'var(--text-1)',
              textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
            }}>
              {task.title}
            </p>
          </Link>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {task.system && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.system.color ?? 'var(--text-3)' }} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.system.name}</span>
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs" style={{ color: new Date(task.dueDate) < new Date() ? '#FF5757' : 'var(--text-3)' }}>
                {daysLeft(task.dueDate)}
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: `${STATUS_COLOR[task.status]}15`, color: STATUS_COLOR[task.status], fontSize: 10 }}>
              {STATUS_LABEL[task.status]}
            </span>
            {task.assignee && <Initials name={task.assignee.name} size={20} />}
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(task.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// TABLE VIEW
// ────────────────────────────────────────────

function TableView({ tasks, onUpdate, selectedIds, onToggleSelect, onToggleSelectAll }: {
  tasks: Task[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < tasks.length;

  return (
    <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--glass-border)' }}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
            <th className="px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={onToggleSelectAll}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: 'var(--brand)' }}
              />
            </th>
            {['', 'Title', 'Status', 'Priority', 'Assignee', 'System', 'Due', 'Created'].map(h => (
              <th key={h} className="text-xs font-light tracking-[0.05em] px-4 py-3"
                style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--glass-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="transition-all"
              style={{
                borderBottom: '1px solid var(--glass-border)',
                background: selectedIds.has(task.id) ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}>
              <td className="px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(task.id)}
                  onChange={() => onToggleSelect(task.id)}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: 'var(--brand)' }}
                />
              </td>
              <td className="px-4 py-2.5">
                <button onClick={() => onUpdate(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{
                    border: `1.5px solid ${STATUS_COLOR[task.status]}`,
                    background: task.status === 'DONE' ? STATUS_COLOR['DONE'] : 'transparent',
                  }}>
                  {task.status === 'DONE' && (
                    <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                      <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </td>
              <td className="px-4 py-2.5">
                <Link href={`/tasks/${task.id}`} className="text-sm font-light hover:underline"
                  style={{ color: task.status === 'DONE' ? 'var(--text-3)' : 'var(--text-1)' }}>
                  {task.title}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <select value={task.status}
                  onChange={e => onUpdate(task.id, { status: e.target.value })}
                  className="text-xs font-light px-2 py-1 rounded appearance-none"
                  style={{ background: `${STATUS_COLOR[task.status]}15`, color: STATUS_COLOR[task.status], border: 'none' }}>
                  {STATUSES.map(s => <option key={s} value={s} style={{ background: '#111' }}>{STATUS_LABEL[s]}</option>)}
                </select>
              </td>
              <td className="px-4 py-2.5">
                <select value={task.priority}
                  onChange={e => onUpdate(task.id, { priority: e.target.value })}
                  className="text-xs font-light px-2 py-1 rounded appearance-none"
                  style={{ background: `${PRIORITY_COLOR[task.priority]}15`, color: PRIORITY_COLOR[task.priority], border: 'none' }}>
                  {PRIORITIES.map(p => <option key={p} value={p} style={{ background: '#111' }}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </td>
              <td className="px-4 py-2.5">
                {task.assignee ? (
                  <span className="flex items-center gap-1.5">
                    <Initials name={task.assignee.name} size={18} />
                    <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{task.assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {task.system ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.system.color ?? 'var(--text-3)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.system.name}</span>
                  </span>
                ) : <span className="text-xs" style={{ color: 'var(--text-3)' }}>—</span>}
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs" style={{ color: task.dueDate && new Date(task.dueDate) < new Date() ? '#FF5757' : 'var(--text-3)' }}>
                  {task.dueDate ? daysLeft(task.dueDate) : '—'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(task.createdAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
