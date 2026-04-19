'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

type TaskItem = {
  id: string;
  status: string;
  input: string;
  createdAt: string;
  systemName: string;
  systemColor: string | null;
  workflowName: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#C8F26B',
  RUNNING: '#7193ED',
  FAILED: '#FF6B6B',
  CANCELLED: 'rgba(255,255,255,0.25)',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function TasksWidget({ widget }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = widget.config.limit ?? 5;
  const statusFilter = widget.config.statusFilter ?? 'all';

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        let items = (d.recentExecutions ?? []) as TaskItem[];
        if (statusFilter !== 'all') {
          items = items.filter((t) => t.status === statusFilter.toUpperCase());
        }
        setTasks(items.slice(0, limit));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [limit, statusFilter]);

  return (
    <div className="h-full flex flex-col px-5 py-4">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      {loading ? (
        <div className="space-y-2 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No tasks found
        </p>
      ) : (
        <div className="space-y-1 flex-1 overflow-auto">
          {tasks.map((task) => {
            const statusColor = STATUS_COLORS[task.status] ?? 'rgba(255,255,255,0.3)';
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === 'RUNNING' ? 'animate-pulse' : ''}`}
                  style={{ background: statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>
                    {task.workflowName || task.input || 'Task'}
                  </p>
                  <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                    {task.systemName}
                  </p>
                </div>
                <span className="text-[10px] font-light tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {timeAgo(task.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
