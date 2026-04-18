'use client';

import Link from 'next/link';
import Widget from './Widget';

type Execution = {
  id: string;
  status: string;
  input: string;
  createdAt: string;
  completedAt: string | null;
  systemName: string;
  systemColor: string | null;
  workflowName: string | null;
};

type Props = {
  executions: Execution[];
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const columns = [
  { key: 'RUNNING', label: 'Running', accent: '#3b82f6' },
  { key: 'COMPLETED', label: 'Completed', accent: '#22c55e' },
  { key: 'FAILED', label: 'Failed', accent: '#ef4444' },
] as const;

export default function WorkflowKanbanWidget({ executions }: Props) {
  const grouped = {
    RUNNING: executions.filter((e) => e.status === 'RUNNING'),
    COMPLETED: executions.filter((e) => e.status === 'COMPLETED'),
    FAILED: executions.filter((e) => e.status === 'FAILED'),
  };

  return (
    <Widget title="WORKFLOW EXECUTIONS" span={2}>
      <div className="grid grid-cols-3 gap-3 h-full min-h-0">
        {columns.map((col) => {
          const items = grouped[col.key];
          return (
            <div key={col.key} className="flex flex-col min-h-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: col.accent }}
                />
                <span
                  className="text-[10px] tracking-wider font-light uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {col.label}
                </span>
                <span
                  className="text-[10px] tabular-nums"
                  style={{ color: 'var(--text-3)' }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
                {items.length === 0 && (
                  <p
                    className="text-[10px] font-light py-3 text-center"
                    style={{ color: 'var(--text-3)' }}
                  >
                    None
                  </p>
                )}
                {items.map((exec) => (
                  <Link
                    key={exec.id}
                    href={`/executions/${exec.id}`}
                    className="glass rounded-lg px-2.5 py-2 flex flex-col gap-1 transition-all hover:scale-[1.01]"
                  >
                    {/* Input text */}
                    <p
                      className="text-[11px] font-light leading-tight line-clamp-2"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {exec.input}
                    </p>

                    {/* Workflow name */}
                    {exec.workflowName && (
                      <span
                        className="text-[9px] font-light truncate"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {exec.workflowName}
                      </span>
                    )}

                    {/* Footer: system + time */}
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: exec.systemColor || 'var(--text-3)' }}
                        />
                        <span
                          className="text-[9px] font-light truncate"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {exec.systemName}
                        </span>
                      </div>
                      <span
                        className="text-[9px] tabular-nums shrink-0"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {timeAgo(exec.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}
