'use client';

import Link from 'next/link';
import Widget from './Widget';

type Goal = {
  id: string;
  title: string;
  status: string;
  progress: number | null;
  target: string | null;
  current: string | null;
  metric: string | null;
  dueDate: string | null;
  systemName: string;
  systemColor: string | null;
};

type GoalsWidgetProps = {
  goals: Goal[];
};

function statusColor(status: string): string {
  switch (status) {
    case 'ON_TRACK': return '#C8F26B';
    case 'AT_RISK': return '#F7C700';
    case 'BEHIND': return '#FF5757';
    default: return 'var(--text-3)';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ON_TRACK': return 'On track';
    case 'AT_RISK': return 'At risk';
    case 'BEHIND': return 'Behind';
    default: return status;
  }
}

function statusTagClass(status: string): string {
  switch (status) {
    case 'ON_TRACK': return 'tag-status-on-track';
    case 'AT_RISK': return 'tag-status-at-risk';
    default: return 'tag-priority-urgent';
  }
}

function daysLeft(dateStr: string): string {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return `${diff}d left`;
}

export default function GoalsWidget({ goals }: GoalsWidgetProps) {
  return (
    <Widget title="GOALS" action={{ label: 'View all →', href: '/goals' }}>
      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '300px' }}>
        {goals.length === 0 && (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No goals set</p>
        )}
        {goals.map(goal => {
          const pct = Math.round(goal.progress ?? 0);
          const color = statusColor(goal.status);

          return (
            <Link key={goal.id} href={`/goals/${goal.id}`} className="glass-deep rounded-xl p-4 block transition-colors hover:bg-white/[0.02]">
              {/* Title + status tag */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-light leading-snug" style={{ color: 'var(--text-1)' }}>
                  {goal.title}
                </span>
                <span className={`tag ${statusTagClass(goal.status)} shrink-0`}>
                  {statusLabel(goal.status)}
                </span>
              </div>

              {/* System + due date */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: goal.systemColor || 'var(--text-3)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {goal.systemName}
                  </span>
                </div>
                {goal.dueDate && (
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {daysLeft(goal.dueDate)}
                  </span>
                )}
              </div>

              {/* Progress bar + percentage */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                </div>
                <span className="stat-number text-sm tabular-nums shrink-0 w-10 text-right"
                  style={{ color }}>
                  {pct}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Widget>
  );
}
