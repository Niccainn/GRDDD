'use client';

/**
 * TrustPrimer — the empty-state trust primitive visible on every
 * Environment page before any action has run.
 *
 * Communicates the three commitments the product makes to the user
 * in one glance:
 *   1. Every Nova action explains itself.
 *   2. One click to undo within 24 hours.
 *   3. Every override teaches Nova.
 *
 * Collapses to a small chip once the Environment has meaningful
 * activity (≥ 5 actions on the ledger), so mature Environments
 * don't carry the introductory banner forever. Dismissible as a
 * hard override via localStorage.
 */

import { useEffect, useState } from 'react';

type Props = { environmentId: string };

function storageKey(envId: string): string {
  return `grid:trust-primer-dismissed:${envId}`;
}

export default function TrustPrimer({ environmentId }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [actionsCount, setActionsCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey(environmentId)) === 'true');
    } catch {
      /* non-fatal */
    }
    // Peek at the action ledger so we know whether to show the banner
    // in full or as a collapsed chip.
    fetch(`/api/environments/${environmentId}/actions?limit=5`)
      .then(r => r.json())
      .then(d => setActionsCount(Array.isArray(d.rows) ? d.rows.length : 0))
      .catch(() => setActionsCount(0));
  }, [environmentId]);

  if (dismissed) return null;

  // Mature Environment — collapse to a chip.
  if (actionsCount !== null && actionsCount >= 5) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
        style={{
          background: 'rgba(200,242,107,0.06)',
          border: '1px solid rgba(200,242,107,0.18)',
          color: '#C8F26B',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C8F26B' }} />
        <span className="text-[10px] tracking-wider uppercase font-light">
          Every Nova action explains itself · 24h undo · teach on override
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6 relative"
      style={{
        background: 'rgba(200,242,107,0.04)',
        border: '1px solid rgba(200,242,107,0.18)',
      }}
    >
      <button
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(storageKey(environmentId), 'true');
          } catch {
            /* non-fatal */
          }
        }}
        aria-label="Dismiss"
        className="absolute top-4 right-4 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
        </svg>
      </button>
      <p
        className="text-[10px] tracking-[0.18em] uppercase font-light mb-3"
        style={{ color: '#C8F26B' }}
      >
        How Nova works here
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pillar
          num="1"
          title="Every action explains itself"
          body="Click any row in the action ledger to see what Nova read, what it decided, and what it skipped. No black boxes."
        />
        <Pillar
          num="2"
          title="One click to undo"
          body="Autonomous Nova actions have a 24-hour reversible window. Undoing an action also tells Nova not to repeat it."
        />
        <Pillar
          num="3"
          title="Every override teaches Nova"
          body="Mark a result as wrong with three pills plus one line of context. Nova remembers — future calls factor it in."
        />
      </div>
    </div>
  );
}

function Pillar({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-light"
          style={{ background: 'rgba(200,242,107,0.12)', color: '#C8F26B', border: '1px solid rgba(200,242,107,0.25)' }}
        >
          {num}
        </span>
        <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
          {title}
        </p>
      </div>
      <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
        {body}
      </p>
    </div>
  );
}
