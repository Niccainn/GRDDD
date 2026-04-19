'use client';

import { useEffect, useState, useCallback } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
  systemName: string | null;
  systemColor: string | null;
  createdAt: string;
};

const COLUMNS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'var(--text-3)',
  TODO: 'var(--text-2)',
  IN_PROGRESS: '#F7C700',
  REVIEW: '#BF9FF1',
  DONE: '#15AD70',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#FF5757',
  HIGH: '#FF8C42',
  MEDIUM: '#F7C700',
  LOW: 'var(--text-3)',
};

export default function EnvironmentTasks() {
  const { environmentId } = useEnvironmentWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [newTask, setNewTask] = useState('');
  const [dragItem, setDragItem] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/tasks?environmentId=${environmentId}`)
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  async function addTask() {
    if (!newTask.trim()) return;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask, environmentId, status: 'TODO', priority: 'MEDIUM' }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
      setNewTask('');
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  function daysUntil(iso: string | null) {
    if (!iso) return null;
    const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (d < 0) return 'overdue';
    if (d === 0) return 'today';
    return `${d}d`;
  }

  function handleDragStart(id: string) { setDragItem(id); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleDrop(status: string) {
    if (dragItem) {
      updateStatus(dragItem, status);
      setDragItem(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="text-xs font-light pl-7 pr-3 py-1.5 rounded-lg focus:outline-none transition-all w-44"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
              }}
            />
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setView('list')}
              className="px-3 py-1.5 text-xs font-light transition-all"
              style={{
                background: view === 'list' ? 'var(--glass-active)' : 'transparent',
                color: view === 'list' ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              List
            </button>
            <button
              onClick={() => setView('board')}
              className="px-3 py-1.5 text-xs font-light transition-all"
              style={{
                background: view === 'board' ? 'var(--glass-active)' : 'transparent',
                color: view === 'board' ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              Board
            </button>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="flex-1 text-xs font-light px-4 py-2.5 rounded-xl focus:outline-none transition-all"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          />
          <button
            onClick={addTask}
            className="px-4 py-2.5 rounded-xl text-xs font-light transition-all"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No tasks yet</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Add a task above to get started</p>
            </div>
          ) : (
            filtered.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.002]"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {/* Status toggle */}
                <button
                  onClick={() => updateStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                  className="flex-shrink-0 w-4 h-4 rounded-full border transition-all flex items-center justify-center"
                  style={{
                    borderColor: STATUS_COLORS[task.status] ?? 'var(--glass-border)',
                    background: task.status === 'DONE' ? '#15AD70' : 'transparent',
                  }}
                >
                  {task.status === 'DONE' && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 5L4.5 7L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Priority dot */}
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: PRIORITY_COLORS[task.priority] ?? 'var(--text-3)' }}
                />

                {/* Title */}
                <span
                  className="flex-1 text-xs font-light truncate"
                  style={{
                    color: task.status === 'DONE' ? 'var(--text-3)' : 'var(--text-1)',
                    textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>

                {/* System attribution */}
                {task.systemName && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.systemColor ?? 'var(--text-3)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.systemName}</span>
                  </span>
                )}

                {/* Assignee */}
                {task.assignee && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>{task.assignee}</span>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: daysUntil(task.dueDate) === 'overdue' ? '#FF5757' : 'var(--text-3)' }}
                  >
                    {daysUntil(task.dueDate)}
                  </span>
                )}

                {/* Status badge */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: `${STATUS_COLORS[task.status]}15`,
                    color: STATUS_COLORS[task.status],
                    border: `1px solid ${STATUS_COLORS[task.status]}25`,
                  }}
                >
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col);
            return (
              <div
                key={col}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col)}
                className="rounded-xl p-3 min-h-[300px]"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[col] }} />
                  <span className="text-xs font-light tracking-wide" style={{ color: STATUS_COLORS[col] }}>
                    {STATUS_LABELS[col]}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-3)' }}>{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01]"
                      style={{
                        background: 'var(--glass-hover)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: dragItem === task.id ? 'var(--glass-shadow-sm)' : 'none',
                      }}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                          style={{ background: PRIORITY_COLORS[task.priority] ?? 'var(--text-3)' }} />
                        <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {task.systemName && (
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.systemName}</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs ml-auto"
                            style={{ color: daysUntil(task.dueDate) === 'overdue' ? '#FF5757' : 'var(--text-3)' }}>
                            {daysUntil(task.dueDate)}
                          </span>
                        )}
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
