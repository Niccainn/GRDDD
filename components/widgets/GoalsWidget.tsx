'use client';

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
    case 'ON_TRACK': return '#22c55e';
    case 'AT_RISK': return 'var(--warning)';
    case 'BEHIND': return 'var(--danger)';
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
    <Widget title="GOALS">
      <div className="space-y-4">
        {goals.length === 0 && (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No goals set</p>
        )}
        {goals.map((goal) => {
          const pct = goal.progress ?? 0;
          const color = statusColor(goal.status);

          return (
            <div key={goal.id} className="space-y-1.5">
              {/* Title row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                  {goal.title}
                </span>
                <span
                  className="text-[10px] font-light px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color, border: `1px solid ${color}33` }}
                >
                  {statusLabel(goal.status)}
                </span>
              </div>

              {/* System + due date */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ background: goal.systemColor || 'var(--text-3)' }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {goal.systemName}
                  </span>
                </div>
                {goal.dueDate && (
                  <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                    {daysLeft(goal.dueDate)}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%`, background: color }}
                  />
                </div>
                <span className="text-[10px] font-light shrink-0" style={{ color: 'var(--text-3)' }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}
