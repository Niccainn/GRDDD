'use client';

import Link from 'next/link';
import Widget from './Widget';

type System = {
  id: string;
  name: string;
  color: string | null;
  healthScore: number | null;
  workflows: number;
  executions: number;
};

type Props = {
  systems: System[];
};

function healthColor(score: number | null): string {
  if (score === null) return 'var(--text-3)';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

export default function SystemHealthWidget({ systems }: Props) {
  return (
    <Widget title="SYSTEM HEALTH">
      <div className="flex flex-col gap-2 overflow-y-auto h-full">
        {systems.length === 0 && (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            No systems yet
          </p>
        )}
        {systems.map((system) => (
          <Link
            key={system.id}
            href={`/systems/${system.id}`}
            className="glass rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all hover:scale-[1.01]"
          >
            {/* Color dot + name */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: system.color || 'var(--text-3)' }}
            />
            <span
              className="text-xs font-light truncate flex-1 min-w-0"
              style={{ color: 'var(--text-1)' }}
            >
              {system.name}
            </span>

            {/* Health score */}
            <span
              className="text-sm font-medium tabular-nums shrink-0"
              style={{ color: healthColor(system.healthScore) }}
            >
              {system.healthScore !== null ? system.healthScore : '—'}
            </span>

            {/* Stats */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                {system.workflows}w
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                {system.executions}e
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Widget>
  );
}
