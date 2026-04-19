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
  if (score >= 80) return '#C8F26B';
  if (score >= 60) return '#F7C700';
  return '#FF5757';
}

// Mini health bar — visual indicator
function HealthBar({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: healthColor(score) }} />
    </div>
  );
}

export default function SystemHealthWidget({ systems }: Props) {
  return (
    <Widget title="SYSTEM HEALTH" action={{ label: 'View all →', href: '/systems' }}>
      <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '280px' }}>
        {systems.length === 0 && (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No systems yet</p>
        )}
        {systems.map(system => (
          <Link
            key={system.id}
            href={`/systems/${system.id}`}
            className="glass-deep rounded-xl px-4 py-3 flex items-center gap-3 transition-all group hover:scale-[1.005]"
          >
            {/* Color dot */}
            <div className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: system.color || 'var(--text-3)' }} />

            {/* Health bar */}
            <HealthBar score={system.healthScore} />

            {/* Health number — bold */}
            <span className="stat-number text-xl shrink-0 w-8 text-right"
              style={{ color: healthColor(system.healthScore) }}>
              {system.healthScore !== null ? Math.round(system.healthScore) : '—'}
            </span>

            {/* Mini stats */}
            <div className="flex items-center gap-1.5 shrink-0">
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
