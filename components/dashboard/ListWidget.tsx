'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

type ListItem = {
  id: string;
  title: string;
  status: string;
  time: string;
  color?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#15AD70',
  RUNNING: '#7193ED',
  FAILED: '#FF6B6B',
  ACTIVE: '#15AD70',
  DRAFT: 'rgba(255,255,255,0.3)',
  PAUSED: '#F7C700',
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

export default function ListWidget({ widget }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = widget.config.limit ?? 5;

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        const executions = (d.recentExecutions ?? []).slice(0, limit).map((e: any) => ({
          id: e.id,
          title: e.workflowName || e.input || 'Execution',
          status: e.status,
          time: e.createdAt,
          color: e.systemColor,
        }));
        setItems(executions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [limit]);

  return (
    <div className="h-full flex flex-col px-5 py-4">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      {loading ? (
        <div className="space-y-2 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No items
        </p>
      ) : (
        <div className="space-y-1 flex-1 overflow-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 py-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLORS[item.status] ?? 'rgba(255,255,255,0.3)' }}
              />
              <span className="flex-1 text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>
                {item.title}
              </span>
              <span
                className="text-[10px] font-light px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  color: STATUS_COLORS[item.status] ?? 'var(--text-3)',
                  background: `${STATUS_COLORS[item.status] ?? 'rgba(255,255,255,0.1)'}15`,
                }}
              >
                {item.status.toLowerCase()}
              </span>
              <span className="text-[10px] font-light tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {timeAgo(item.time)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
