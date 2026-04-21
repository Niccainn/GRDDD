'use client';
/**
 * Small System card — used in Modes B + C.
 * Shows name, health, last Nova action, autonomy mode.
 */
import Link from 'next/link';

export type SystemCardData = {
  id: string;
  name: string;
  color: string | null;
  healthScore: number | null;
  lastActionText?: string | null;
  autonomyMode?: 'manual' | 'suggest' | 'auto-approval' | 'auto' | null;
};

const AUTONOMY_LABEL: Record<NonNullable<SystemCardData['autonomyMode']>, string> = {
  manual: 'Manual',
  suggest: 'Suggest',
  'auto-approval': 'Auto w/ approval',
  auto: 'Auto',
};

export default function SystemCard({ system }: { system: SystemCardData }) {
  const color = system.color ?? '#7193ED';
  const healthText =
    system.healthScore === null ? '—' : `${Math.round(system.healthScore)}%`;

  return (
    <Link
      href={`/systems/${system.id}`}
      className="block p-4 rounded-xl transition-colors hover:bg-white/[0.04]"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-1)' }}
        >
          {system.name}
        </span>
        <span
          className="ml-auto text-[10px] tabular-nums"
          style={{ color: 'var(--text-3)' }}
        >
          {healthText}
        </span>
      </div>
      {system.lastActionText && (
        <p
          className="text-[11px] leading-snug mb-2 line-clamp-2"
          style={{ color: 'var(--text-3)' }}
        >
          {system.lastActionText}
        </p>
      )}
      {system.autonomyMode && (
        <span
          className="inline-block text-[9px] tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--glass)',
            color: 'var(--text-3)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {AUTONOMY_LABEL[system.autonomyMode]}
        </span>
      )}
    </Link>
  );
}
