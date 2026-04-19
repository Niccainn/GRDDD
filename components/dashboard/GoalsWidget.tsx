'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

type GoalItem = {
  id: string;
  title: string;
  status: string;
  progress: number;
};

export default function GoalsWidget({ widget }: Props) {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = widget.config.limit ?? 4;

  useEffect(() => {
    fetch(`/api/goals?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.goals ?? d ?? []).slice(0, limit).map((g: any) => ({
          id: g.id,
          title: g.title ?? g.name ?? 'Goal',
          status: g.status ?? 'IN_PROGRESS',
          progress: g.progress ?? 0,
        }));
        setGoals(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [limit]);

  function statusColor(status: string) {
    if (status === 'COMPLETED') return '#C8F26B';
    if (status === 'AT_RISK') return '#FF6B6B';
    return '#F7C700';
  }

  return (
    <div className="h-full flex flex-col px-5 py-4">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      {loading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No goals yet
        </p>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {goals.map((goal) => {
            const color = statusColor(goal.status);
            return (
              <div key={goal.id} className="px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-light truncate flex-1" style={{ color: 'var(--text-2)' }}>{goal.title}</p>
                  <span className="text-[10px] font-light tabular-nums ml-2" style={{ color }}>
                    {goal.progress}%
                  </span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${goal.progress}%`,
                      background: color,
                      boxShadow: `0 0 8px ${color}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
