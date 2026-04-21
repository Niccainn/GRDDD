'use client';
/**
 * Mode B — first week view.
 *
 * Per PHASE_3_COCKPIT.md: optimized for *trust building*, not metrics.
 * Greeting + autonomy summary, TODAY feed, small Systems grid.
 * No stat cards. Never shows "0" or "—".
 */
import Link from 'next/link';
import ApprovalFeed from './ApprovalFeed';
import SystemCard, { type SystemCardData } from './SystemCard';

export type ModeBProps = {
  displayName: string | null;
  novaSummary: string | null;
  systems: SystemCardData[];
};

export default function ModeB_FirstWeek({
  displayName,
  novaSummary,
  systems,
}: ModeBProps) {
  const visibleSystems = systems.slice(0, 4);
  const name = displayName?.split(' ')[0] ?? 'there';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-10">
        <p
          className="text-[11px] tracking-[0.15em] mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {greeting()}, {name.toUpperCase()}
        </p>
        <h1
          className="text-2xl font-light leading-snug"
          style={{ color: 'var(--text-1)' }}
        >
          {novaSummary ?? 'Nova is watching your Systems. Nothing needs you yet.'}
        </h1>
      </header>

      <section className="mb-12">
        <h2
          className="text-[11px] tracking-[0.15em] mb-4"
          style={{ color: 'var(--text-3)' }}
        >
          TODAY
        </h2>
        <ApprovalFeed />
      </section>

      {visibleSystems.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-[11px] tracking-[0.15em]"
              style={{ color: 'var(--text-3)' }}
            >
              YOUR SYSTEMS
            </h2>
            {systems.length > visibleSystems.length && (
              <Link
                href="/systems"
                className="text-[11px] font-light"
                style={{ color: 'var(--text-3)' }}
              >
                View all {systems.length} →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleSystems.map(s => (
              <SystemCard key={s.id} system={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'GOOD NIGHT';
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}
