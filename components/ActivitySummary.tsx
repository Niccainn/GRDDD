'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { relativeTime } from '@/lib/time';

type ActivityEvent = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityName: string | null;
  actorName: string | null;
};

const DOT_COLORS: Record<string, string> = {
  system: '#15AD70',
  workflow: '#15AD70',
  execution: '#7193ED',
  goal: '#F7C700',
  nova: '#BF9FF1',
  agent: '#BF9FF1',
  member: '#FF9F43',
  automation: '#7193ED',
  webhook: '#15AD70',
  environment: '#15AD70',
};

function getDotColor(action: string): string {
  const prefix = action.split('.')[0];
  // Special overrides
  if (action.endsWith('.failed') || action.endsWith('.deleted') || action.endsWith('.removed')) return '#FF6B6B';
  return DOT_COLORS[prefix] ?? 'rgba(255,255,255,0.3)';
}

function formatAction(action: string): string {
  return action.replace('.', ' ').replace(/_/g, ' ');
}

export default function ActivitySummary() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/activity?limit=5&page=1')
      .then(r => r.json())
      .then(d => {
        setEvents(d.events ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-light tracking-wide" style={{ color: 'var(--text-2)' }}>Recent Activity</span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-light tracking-wide" style={{ color: 'var(--text-2)' }}>Recent Activity</span>
        <Link
          href="/activity"
          className="text-xs font-light transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          View all
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-xs font-light py-2" style={{ color: 'var(--text-3)' }}>
          No recent activity
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const color = getDotColor(ev.action);
            return (
              <div key={ev.id} className="flex items-center gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: color, boxShadow: `0 0 4px ${color}30` }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-light truncate block capitalize" style={{ color: 'var(--text-2)' }}>
                    {formatAction(ev.action)}
                    {ev.entityName && (
                      <span style={{ color: 'var(--text-3)' }}> {ev.entityName}</span>
                    )}
                  </span>
                </div>
                <span className="text-xs font-light tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {relativeTime(ev.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
