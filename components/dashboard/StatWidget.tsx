'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

const METRIC_LABELS: Record<string, string> = {
  totalTasks: 'Total Tasks',
  completedTasks: 'Completed',
  activeTasks: 'Active',
  failedTasks: 'Failed',
  totalWorkflows: 'Workflows',
  activeWorkflows: 'Active Workflows',
  totalExecutions: 'Executions',
  successRate: 'Success Rate',
  totalGoals: 'Goals',
  completedGoals: 'Completed Goals',
  goalProgress: 'Goal Progress',
  recentActivityCount: 'Recent Activity',
};

export default function StatWidget({ widget }: Props) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const metric = widget.config.metric ?? 'totalTasks';
  const color = widget.config.color ?? '#7193ED';
  const label = widget.title || METRIC_LABELS[metric] || metric;

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        setValue(d[metric] ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [metric]);

  const displayValue = metric === 'successRate' || metric === 'goalProgress'
    ? `${value ?? 0}%`
    : String(value ?? 0);

  return (
    <div className="h-full flex flex-col justify-center px-5 py-4">
      {loading ? (
        <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <>
          <p className="text-xs font-light mb-2" style={{ color: 'var(--text-3)' }}>{label}</p>
          <p className="stat-number" style={{ color }}>{displayValue}</p>
        </>
      )}
    </div>
  );
}
