'use client';

/**
 * UpcomingLane — pillar 1 of the cognition-platform framing.
 *
 * /dashboard's first three lanes should be verb-shaped: about to do,
 * just did, needs you for. This component owns the first.
 *
 * Phase A scope: active scheduled Automations the caller owns.
 * Phase B will add due Tasks, pending Approvals, and scheduled
 * Workflow runs as additional row types — same component, more
 * sources.
 *
 * Empty state is intentionally absent: if the user has no scheduled
 * automations the lane simply doesn't render. The dashboard
 * shouldn't earn space with "Nothing scheduled" zero-states.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Automation = {
  id: string;
  name: string;
  trigger: string;
  triggerConfig: string;
  runCount: number;
  lastRunAt: string | null;
  environmentName: string;
  environmentSlug: string;
};

function timeSince(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Best-effort prose summary of a cron-style trigger config. The
 *  config blob is application-specific; we parse what we can and
 *  fall back to "scheduled". */
function describeSchedule(configJson: string): string {
  try {
    const cfg = JSON.parse(configJson || '{}');
    if (typeof cfg.cron === 'string' && cfg.cron) return cfg.cron;
    if (typeof cfg.interval === 'string' && cfg.interval) return cfg.interval;
    if (typeof cfg.frequency === 'string' && cfg.frequency) return `every ${cfg.frequency}`;
  } catch {/* fall through */}
  return 'scheduled';
}

export default function UpcomingLane({ className }: { className?: string }) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/upcoming')
      .then(async r => (r.ok ? r.json() : null))
      .then(d => {
        setAutomations(d?.automations ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || automations.length === 0) return null;

  return (
    <div
      className={`rounded-2xl p-5 ${className ?? ''}`}
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] tracking-[0.18em] uppercase font-light"
          style={{ color: 'var(--text-3)' }}
        >
          About to do
        </p>
        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
          Scheduled · {automations.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {automations.map(a => (
          <Link
            key={a.id}
            href={`/automations/${a.id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.03)]"
          >
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#7193ED' }}
            />
            <span
              className="flex-1 text-xs font-light truncate"
              style={{ color: 'var(--text-2)' }}
            >
              {a.name}
            </span>
            <span
              className="text-[10px] font-light flex-shrink-0"
              style={{ color: 'var(--text-3)' }}
              title={`${a.runCount} prior runs`}
            >
              {describeSchedule(a.triggerConfig)}
            </span>
            <span
              className="text-[10px] font-light flex-shrink-0 w-12 text-right"
              style={{ color: 'var(--text-3)' }}
            >
              last {timeSince(a.lastRunAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
