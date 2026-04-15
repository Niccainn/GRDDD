'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

export default function ProgressWidget({ widget }: Props) {
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(100);
  const [loading, setLoading] = useState(true);

  const metric = widget.config.metric ?? 'goalProgress';
  const color = widget.config.color ?? '#15AD70';
  const label = widget.title || 'Progress';

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        if (metric === 'goalProgress') {
          setCurrent(d.goalProgress ?? 0);
          setTotal(100);
        } else if (metric === 'successRate') {
          setCurrent(d.successRate ?? 0);
          setTotal(100);
        } else if (metric === 'completedTasks') {
          setCurrent(d.completedTasks ?? 0);
          setTotal(d.totalTasks || 1);
        } else if (metric === 'completedGoals') {
          setCurrent(d.completedGoals ?? 0);
          setTotal(d.totalGoals || 1);
        } else {
          setCurrent(widget.config.current ?? 0);
          setTotal(widget.config.total ?? 100);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [metric, widget.config.current, widget.config.total]);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-24 h-24 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-5 py-4">
      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Progress ring */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-light tabular-nums" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <p className="text-xs font-light mt-3" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
        {current} / {total}
      </p>
    </div>
  );
}
