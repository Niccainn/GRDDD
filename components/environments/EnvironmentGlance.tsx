'use client';

/**
 * EnvironmentGlance — top-of-environment summary card. Answers
 * "what is this environment, and what's in it, at a glance" in a
 * single read before the user scrolls into widgets.
 */

import Link from 'next/link';

type System = { id: string; activeWorkflows: number; executions: number; healthScore: number | null };
type Goal = { id: string; status: string };
type Signal = { id: string; status: string };
type NovaLog = { id: string; createdAt: string };
type Execution = { id: string; status: string };

type Props = {
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  owner: string;
  systems: System[];
  goals: Goal[];
  signals: Signal[];
  executions: Execution[];
  novaLogs: NovaLog[];
  successRate: number;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function EnvironmentGlance({
  name,
  slug,
  description,
  color,
  owner,
  systems,
  goals,
  signals,
  executions,
  novaLogs,
  successRate,
}: Props) {
  const accent = color || '#C8F26B';
  const activeWorkflows = systems.reduce((s, sys) => s + sys.activeWorkflows, 0);
  const openSignals = signals.filter(s => s.status !== 'RESOLVED' && s.status !== 'DISMISSED').length;
  const activeGoals = goals.filter(g => g.status !== 'ACHIEVED' && g.status !== 'CANCELLED').length;
  const running = executions.filter(e => e.status === 'RUNNING').length;
  const avgHealth = systems.length
    ? Math.round(systems.reduce((s, sys) => s + (sys.healthScore ?? 0), 0) / systems.length)
    : null;
  const lastNova = novaLogs[0]?.createdAt;

  const stats: Array<{ label: string; value: number; href: string; accent?: string }> = [
    { label: 'Systems', value: systems.length, href: '/systems' },
    { label: 'Active workflows', value: activeWorkflows, href: '/workflows' },
    { label: 'Open goals', value: activeGoals, href: '/goals' },
    { label: 'Open signals', value: openSignals, href: '/inbox', accent: openSignals > 0 ? '#F5D76E' : undefined },
    { label: 'Running now', value: running, href: '/executions', accent: running > 0 ? '#7193ED' : undefined },
  ];

  return (
    <div
      className="glass-deep rounded-2xl p-5 md:p-6 animate-fade-in relative overflow-hidden"
      style={{ borderTop: `1px solid ${accent}22` }}
    >
      {/* Ambient accent glow — faint, tied to env color */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none opacity-[0.06]"
        style={{ background: `radial-gradient(ellipse, ${accent}, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: accent, boxShadow: `0 0 12px ${accent}88` }}
            />
            <span className="text-[10px] tracking-[0.18em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
              Environment
            </span>
            <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
              /{slug}
            </span>
          </div>
          <h1
            className="text-2xl md:text-3xl font-extralight leading-tight mb-1"
            style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
          >
            {name}
          </h1>
          {description && (
            <p className="text-sm font-light max-w-xl" style={{ color: 'var(--text-2)' }}>
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
          <span className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>
            Owned by
          </span>
          <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
            {owner}
          </span>
        </div>
      </div>

      {/* Stats row — 2-col on mobile with the 5th item spanning full
          width so there's no awkward empty cell; 5-col flat on
          desktop. */}
      <div className="relative grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden"
        style={{ background: 'var(--glass-border)' }}>
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`px-4 py-3 transition-colors hover:bg-white/[0.02] ${i === stats.length - 1 && stats.length % 2 === 1 ? 'col-span-2 md:col-span-1' : ''}`}
            style={{ background: 'var(--bg)' }}
          >
            <div className="text-[10px] tracking-wider uppercase font-light mb-1" style={{ color: 'var(--text-3)' }}>
              {stat.label}
            </div>
            <div
              className="stat-number text-2xl font-extralight tabular-nums"
              style={{
                color: stat.accent ?? 'var(--text-1)',
                letterSpacing: '-0.02em',
              }}
            >
              {stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* Footer signals */}
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] font-light"
        style={{ color: 'var(--text-3)' }}>
        {avgHealth !== null && (
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full" style={{
              background: avgHealth >= 80 ? '#C8F26B' : avgHealth >= 60 ? '#F5D76E' : '#FF8C69',
            }} />
            Avg health <span style={{ color: 'var(--text-1)' }} className="tabular-nums">{avgHealth}%</span>
          </span>
        )}
        <span>
          Success rate <span style={{ color: 'var(--text-1)' }} className="tabular-nums">{successRate}%</span>
        </span>
        {lastNova && (
          <span>
            Last Nova action <span style={{ color: 'var(--text-1)' }}>{timeAgo(lastNova)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
