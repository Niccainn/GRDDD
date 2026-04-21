'use client';
/**
 * Mode A — no Systems yet. Re-entry to onboarding.
 *
 * Per PHASE_3_COCKPIT.md: should be unreachable after Phase 2
 * onboarding. Defensive layout for edge cases — existing users
 * mid-migration, or someone who deleted all their Systems.
 */
import Link from 'next/link';
import { shippedWedges } from '@/app/welcome/wedges';

export default function ModeA_ZeroState() {
  const wedges = shippedWedges().slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1
        className="text-2xl font-light mb-2 text-center"
        style={{ color: 'var(--text-1)' }}
      >
        What do you want Grid to run for you?
      </h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'var(--text-3)' }}>
        Pick a recurring job. Nova will build the System in minutes.
      </p>

      <div className="space-y-2 mb-8">
        {wedges.map(w => (
          <Link
            key={w.id}
            href={`/welcome?wedge=${w.id}`}
            className="block p-4 rounded-xl transition-colors hover:bg-white/[0.04]"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-1)' }}
              >
                {w.title}
              </span>
              <span
                className="text-[10px] tracking-wide"
                style={{ color: 'var(--text-3)' }}
              >
                ~{w.minutes} min
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {w.oneLiner}
            </p>
          </Link>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/welcome?wedge=custom"
          className="text-xs font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Skip — explore an empty workspace
        </Link>
      </div>
    </div>
  );
}
