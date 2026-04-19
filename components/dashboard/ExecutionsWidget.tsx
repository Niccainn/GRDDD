'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

type ExecItem = {
  id: string;
  status: string;
  input: string;
  createdAt: string;
  completedAt: string | null;
  systemName: string;
  systemColor: string | null;
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

function duration(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m`;
}

export default function ExecutionsWidget({ widget }: Props) {
  const [items, setItems] = useState<ExecItem[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = widget.config.limit ?? 5;
  const statusFilter = widget.config.statusFilter ?? 'all';

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        let execs = (d.recentExecutions ?? []) as ExecItem[];
        if (statusFilter !== 'all') {
          execs = execs.filter((e) => e.status === statusFilter.toUpperCase());
        }
        setItems(execs.slice(0, limit));
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
      ) : items.length === 0 ? (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No executions
        </p>
      ) : (
        <div className="space-y-1 flex-1 overflow-auto">
          {items.map((ex) => {
            const statusColor = STATUS_COLORS[ex.status] ?? 'rgba(255,255,255,0.3)';
            const dur = duration(ex.createdAt, ex.completedAt);
            return (
              <div
                key={ex.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ex.status === 'RUNNING' ? 'animate-pulse' : ''}`}
                  style={{ background: statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>
                    {ex.input || 'Execution'}
                  </p>
                  <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                    {ex.systemName}
                    {dur && <span> - {dur}</span>}
                  </p>
                </div>
                <span
                  className="text-[10px] font-light px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    color: statusColor,
                    background: `${statusColor}15`,
                  }}
                >
                  {ex.status.toLowerCase()}
                </span>
                <span className="text-[10px] font-light tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {timeAgo(ex.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
