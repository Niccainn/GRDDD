'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

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
  BACKLOG: 'rgba(255,255,255,0.2)', TODO: '#7193ED', IN_PROGRESS: '#BF9FF1', REVIEW: '#F7C700', DONE: '#15AD70', CANCELLED: 'rgba(255,255,255,0.15)',
};
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#FF5757', HIGH: '#F7C700', NORMAL: 'rgba(255,255,255,0.3)', LOW: '#15AD70',
};
const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent', HIGH: 'High', NORMAL: 'Normal', LOW: 'Low',
};

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

// ────────────────────────────────────────────
// GRIP DOTS DRAG HANDLE
// ────────────────────────────────────────────
function GripDots() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" style={{ color: 'rgba(255,255,255,0.15)' }}>
      <circle cx="2.5" cy="2.5" r="1.2" />
      <circle cx="7.5" cy="2.5" r="1.2" />
      <circle cx="2.5" cy="7.5" r="1.2" />
      <circle cx="7.5" cy="7.5" r="1.2" />
      <circle cx="2.5" cy="12.5" r="1.2" />
      <circle cx="7.5" cy="12.5" r="1.2" />
    </svg>
  );
}

export default function TasksBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [envFilter, setEnvFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Quick-add state per column
  const [quickAddCol, setQuickAddCol] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (envFilter) params.set('environmentId', envFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (assigneeFilter) params.set('assigneeId', assigneeFilter);
    fetch(`/api/tasks?${params}`)
      .then(r => r.json())
      .then(d => { setTasks(d.tasks); setLoaded(true); });
  }, [envFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    load();
    fetch('/api/environments').then(r => r.json()).then(envs => {
      setEnvironments(envs);
    }).catch(() => {});
    fetch('/api/team').then(r => r.json()).then(d => setMembers(d.members ?? d ?? [])).catch(() => {});
  }, [load]);

  // Focus quick-add input when opened
  useEffect(() => {
    if (quickAddCol && quickAddRef.current) {
      quickAddRef.current.focus();
    }
  }, [quickAddCol]);

  // ── PATCH task status ──
  async function updateTaskStatus(id: string, newStatus: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    // Optimistically update local state
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  }

  // ── Quick-add task ──
  async function quickAdd(status: string) {
    if (!quickAddTitle.trim()) return;
    setQuickAddSaving(true);

    // Use first environment if no filter set
    const environmentId = envFilter || (environments.length > 0 ? environments[0].id : '');
    if (!environmentId) {
      setQuickAddSaving(false);
      return;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: quickAddTitle.trim(),
        status,
        priority: 'NORMAL',
        environmentId,
      }),
    });

    if (res.ok) {
      const newTask = await res.json();
      setTasks(prev => [...prev, newTask]);
      setQuickAddTitle('');
      setQuickAddCol(null);
    }
    setQuickAddSaving(false);
  }

  // ── Drag handlers ──
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Add visual feedback after a tick so the drag image captures the original look
    requestAnimationFrame(() => {
      const el = document.getElementById(`task-card-${taskId}`);
      if (el) {
        el.style.opacity = '0.4';
        el.style.transform = 'scale(0.96)';
      }
    });
  }

  function handleDragEnd(taskId: string) {
    const el = document.getElementById(`task-card-${taskId}`);
    if (el) {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    }
    setDragId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  }

  function handleDragLeave(e: React.DragEvent, status: string) {
    // Only clear if actually leaving the column (not entering a child)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      if (dropTarget === status) setDropTarget(null);
    }
  }

  function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        updateTaskStatus(taskId, newStatus);
      }
    }
    setDropTarget(null);
    setDragId(null);
  }

  // Group tasks by status
  const grouped: Record<string, Task[]> = {};
  STATUSES.forEach(s => { grouped[s] = []; });
  tasks.forEach(t => {
    if (grouped[t.status]) grouped[t.status].push(t);
  });

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Tasks</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {tasks.filter(t => ['TODO', 'IN_PROGRESS', 'REVIEW'].includes(t.status)).length} active
            {' / '}
            {tasks.filter(t => t.status === 'DONE').length} completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <Link href="/tasks"
              className="text-xs font-light px-3 py-1.5 transition-all flex items-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.3)',
              }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
              </svg>
              List
            </Link>
            <button
              className="text-xs font-light px-3 py-1.5 transition-all flex items-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
              }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="2" width="4" height="12" rx="1" /><rect x="6" y="2" width="4" height="8" rx="1" /><rect x="11" y="2" width="4" height="10" rx="1" />
              </svg>
              Board
            </button>
          </div>
          <button onClick={() => { setQuickAddCol('TODO'); }}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            + Add task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <select value={envFilter} onChange={e => setEnvFilter(e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All environments</option>
          {environments.map(e => (
            <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All priorities</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p} style={{ background: '#111' }}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-lg appearance-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
          <option value="" style={{ background: '#111' }}>All assignees</option>
          {members.map(m => (
            <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {!loaded ? (
        <div className="overflow-x-auto">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(220px, 1fr))`, minWidth: `${STATUSES.length * 220}px` }}>
          {STATUSES.map(s => (
            <div key={s} className="space-y-2">
              <div className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
              <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
              <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
            </div>
          ))}
        </div>
        </div>
      ) : (
        /* Board columns */
        <div className="overflow-x-auto flex-1">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(220px, 1fr))`, minWidth: `${STATUSES.length * 220}px` }}>
          {STATUSES.map(status => {
            const col = grouped[status] || [];
            const isDropZone = dropTarget === status && dragId !== null;

            return (
              <div
                key={status}
                className="flex flex-col rounded-xl transition-all"
                style={{
                  background: 'var(--glass)',
                  border: isDropZone
                    ? `1.5px dashed ${STATUS_COLOR[status]}`
                    : '1px solid var(--glass-border)',
                  boxShadow: isDropZone ? `0 0 20px ${STATUS_COLOR[status]}15` : 'none',
                }}
                onDragOver={e => handleDragOver(e, status)}
                onDragLeave={e => handleDragLeave(e, status)}
                onDrop={e => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <div className="w-full h-0.5 absolute top-0 left-0 right-0 rounded-t-xl" />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[status] }} />
                  <span className="text-xs font-light tracking-wide" style={{ color: 'var(--text-2)' }}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>
                    {col.length}
                  </span>
                  <button
                    onClick={() => {
                      setQuickAddCol(quickAddCol === status ? null : status);
                      setQuickAddTitle('');
                    }}
                    className="ml-auto text-xs transition-all hover:scale-110"
                    style={{ color: 'var(--text-3)' }}>
                    +
                  </button>
                </div>

                {/* Colored top border line */}
                <div className="mx-3 mb-2 h-px" style={{ background: `${STATUS_COLOR[status]}40` }} />

                {/* Quick-add inline input */}
                {quickAddCol === status && (
                  <div className="px-2 pb-2">
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--glass-deep)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        ref={quickAddRef}
                        type="text"
                        value={quickAddTitle}
                        onChange={e => setQuickAddTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && quickAddTitle.trim()) quickAdd(status);
                          if (e.key === 'Escape') { setQuickAddCol(null); setQuickAddTitle(''); }
                        }}
                        placeholder="Task title..."
                        disabled={quickAddSaving}
                        className="w-full text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => quickAdd(status)}
                          disabled={!quickAddTitle.trim() || quickAddSaving}
                          className="text-xs font-light px-2.5 py-1 rounded-lg transition-all disabled:opacity-30"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                          {quickAddSaving ? '...' : 'Add'}
                        </button>
                        <button
                          onClick={() => { setQuickAddCol(null); setQuickAddTitle(''); }}
                          className="text-xs font-light transition-all"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cards area */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {col.length === 0 && !isDropZone && quickAddCol !== status && (
                    <div className="flex flex-col items-center justify-center py-10 mx-1 rounded-xl"
                      style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Drag tasks here
                      </p>
                    </div>
                  )}

                  {col.map(task => (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={() => handleDragEnd(task.id)}
                      className="group rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all"
                      style={{
                        background: 'var(--glass-deep)',
                        border: '1px solid var(--glass-border)',
                        borderLeft: `2px solid ${PRIORITY_COLOR[task.priority]}`,
                        opacity: dragId === task.id ? 0.4 : 1,
                        transform: dragId === task.id ? 'scale(0.96)' : 'scale(1)',
                      }}
                    >
                      {/* Drag handle + title row */}
                      <div className="flex items-start gap-2">
                        <div className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab">
                          <GripDots />
                        </div>
                        <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0" onClick={e => { if (dragId) e.preventDefault(); }}>
                          <p className="text-sm font-light mb-1.5 leading-snug line-clamp-2" style={{ color: 'var(--text-1)' }}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs font-light line-clamp-2 mb-2" style={{ color: 'var(--text-3)' }}>
                              {task.description}
                            </p>
                          )}
                        </Link>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {task.priority !== 'NORMAL' && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: `${PRIORITY_COLOR[task.priority]}15`,
                              color: PRIORITY_COLOR[task.priority],
                              fontSize: 10,
                            }}>
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                        )}
                        {task.environment && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              color: 'var(--text-3)',
                              fontSize: 10,
                            }}>
                            {task.environment.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs" style={{
                            color: new Date(task.dueDate) < new Date() ? '#FF5757' : 'var(--text-3)',
                            fontSize: 10,
                          }}>
                            {daysLeft(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Bottom row: system + assignee */}
                      <div className="flex items-center justify-between mt-2.5">
                        {task.system ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.system.color ?? 'var(--text-3)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-3)', fontSize: 10 }}>{task.system.name}</span>
                          </span>
                        ) : <span />}
                        <div className="ml-auto">
                          {task.assignee ? (
                            <Initials name={task.assignee.name} size={20} />
                          ) : (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>?</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Column bottom add button */}
                <div className="px-2 pb-2 pt-1">
                  <button
                    onClick={() => {
                      setQuickAddCol(quickAddCol === status ? null : status);
                      setQuickAddTitle('');
                    }}
                    className="w-full text-xs font-light py-2 rounded-lg transition-all hover:bg-white/[0.04]"
                    style={{ color: 'var(--text-3)' }}>
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
