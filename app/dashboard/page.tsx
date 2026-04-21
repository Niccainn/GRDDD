'use client';
/**
 * /dashboard — the cockpit. Rewritten per PHASE_3_COCKPIT.md.
 *
 * One page, three modes:
 *   Mode A — no Systems → re-entry to onboarding (should be
 *     unreachable after Phase 2, defensive only).
 *   Mode B — ≥1 System, first-week view (TODAY feed + Systems grid).
 *   Mode C — mature workspace (stat strips); gated behind
 *     NEXT_PUBLIC_DASHBOARD_MODE_C flag until Phase 3 follow-up.
 *
 * The old 694-line dashboard (stat cards, empty health %, Jump To,
 * Recent Work / AI Activity tabs) is gone. The page now never shows
 * "0" or "—" — empty states are re-entry copy, not metric theatre.
 */
import { useEffect, useState } from 'react';
import ModeA_ZeroState from '@/components/dashboard/ModeA_ZeroState';
import ModeB_FirstWeek from '@/components/dashboard/ModeB_FirstWeek';
import { dashboardMode, type WorkspaceSnapshot } from '@/lib/dashboard/mode';
import type { SystemCardData } from '@/components/dashboard/SystemCard';

type OperateData = {
  systems: Array<{
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    lastActivity?: string | null;
  }>;
  user: {
    displayName: string | null;
    firstName: string | null;
    onboardedAt: string | null;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<OperateData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [novaSummary, setNovaSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/operate-data')
      .then(r => (r.ok ? r.json() : null))
      .then((d: OperateData | null) => {
        if (cancelled) return;
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nova summary — best-effort. Falls back to a calm default headline.
  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(r => (r.ok ? r.json() : null))
      .then((s: { summary?: string } | null) => {
        if (s?.summary) setNovaSummary(s.summary);
      })
      .catch(() => {});
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: 'var(--glass-border)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  const systems = data?.systems ?? [];
  const snapshot: WorkspaceSnapshot = {
    systemCount: systems.length,
    createdAt: data?.user?.onboardedAt ?? null,
    // novaActionCount not in /api/operate-data; Mode C is flag-gated
    // anyway so this short-circuits to Mode B when flag is on.
    novaActionCount: 0,
  };
  const mode = dashboardMode(snapshot);

  if (mode === 'A') return <ModeA_ZeroState />;

  const cardData: SystemCardData[] = systems.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    healthScore: s.healthScore,
    lastActionText: s.lastActivity ?? null,
  }));

  return (
    <ModeB_FirstWeek
      displayName={data?.user?.displayName ?? null}
      novaSummary={novaSummary}
      systems={cardData}
    />
  );
}
