'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

type ActivityEvent = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityName: string | null;
  actorName: string | null;
};

const DOT_COLORS: Record<string, string> = {
  system: '#C8F26B',
  workflow: '#C8F26B',
  execution: '#7193ED',
  goal: '#F7C700',
  nova: '#BF9FF1',
  agent: '#BF9FF1',
  member: '#FF9F43',
  automation: '#7193ED',
};

function getDotColor(action: string): string {
  const prefix = action.split('.')[0];
  if (action.endsWith('.failed') || action.endsWith('.deleted')) return '#FF6B6B';
  return DOT_COLORS[prefix] ?? 'rgba(255,255,255,0.3)';
}

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

export default function ActivityWidget({ widget }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = widget.config.limit ?? 8;

  useEffect(() => {
    fetch(`/api/activity?limit=${limit}&page=1`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [limit]);

  return (
    <div className="h-full flex flex-col px-5 py-4">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      {loading ? (
        <div className="space-y-2 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No recent activity
        </p>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-auto">
          {events.map((ev) => {
            const color = getDotColor(ev.action);
            return (
              <div key={ev.id} className="flex items-center gap-2.5 py-1">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: color, boxShadow: `0 0 4px ${color}30` }}
                />
                <span className="flex-1 text-xs font-light truncate capitalize" style={{ color: 'var(--text-2)' }}>
                  {ev.action.replace('.', ' ').replace(/_/g, ' ')}
                  {ev.entityName && (
                    <span style={{ color: 'var(--text-3)' }}> {ev.entityName}</span>
                  )}
                </span>
                <span className="text-[10px] font-light tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {timeAgo(ev.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
