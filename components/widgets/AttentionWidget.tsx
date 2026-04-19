'use client';

/**
 * AttentionWidget — "what should you care about right now?"
 *
 * Top-of-home-page focus panel. Ranks signals, failed executions,
 * at-risk goals, and unhealthy systems into a single attention
 * stream so the user doesn't have to triage four different tabs
 * on every visit.
 *
 * Visual language: heavy glass card, ranked rows, a dot-matrix
 * attention bar per item. Score drives bar width + a color ramp
 * from teal (cool) to amber (hot). Clicks route to the source
 * entity.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Widget from './Widget';

type AttentionKind = 'signal' | 'execution' | 'goal' | 'system';

type AttentionItem = {
  id: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  reason: string;
  environmentName: string;
  environmentColor?: string | null;
  timestamp: string;
};

const KIND_LABEL: Record<AttentionKind, string> = {
  signal: 'SIG',
  execution: 'RUN',
  goal: 'GOAL',
  system: 'SYS',
};

const KIND_COLOR: Record<AttentionKind, string> = {
  signal: '#F7C700',
  execution: '#FF6B6B',
  goal: '#BF9FF1',
  system: '#7193ED',
};

function scoreColor(score: number): string {
  if (score >= 80) return '#FF6B6B';
  if (score >= 60) return '#F7C700';
  if (score >= 40) return '#BF9FF1';
  return '#15AD70';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function AttentionWidget({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attention?limit=${limit}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setItems(d.items ?? []);
      })
      .catch(e => {
        if (!cancelled) setError(e?.message ?? 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  // Footer actions — every widget now carries 0-3 one-click intents.
  // AttentionWidget is the first instrumented surface because it's
  // the closest to "decision-ready" already — each row is a signal
  // you could triage.
  //
  // Rendered actions scale with the current top item:
  //   1. Triage top signal in inbox (contextual, only when top row
  //      is a SIGnal)
  //   2. Clear dismissed (generic across kinds)
  //   3. Open full triage view (escape hatch)
  const topItem = items && items.length > 0 ? items[0] : null;
  const widgetActions = [
    ...(topItem?.kind === 'signal'
      ? [{
          label: `→ Task: "${topItem.title.slice(0, 32)}${topItem.title.length > 32 ? '…' : ''}"`,
          intent: 'primary' as const,
          onClick: async () => {
            // Reuse the Signal→Task endpoint — optimistic remove from list.
            const r = await fetch(`/api/signals/${topItem.id}/to-task`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{}',
            });
            if (r.ok) setItems(prev => prev?.filter(it => it.id !== topItem.id) ?? null);
          },
        }]
      : []),
    { label: 'Inbox', href: '/inbox', intent: 'ghost' as const },
    { label: 'Refresh', intent: 'ghost' as const, onClick: () => setItems(null) },
  ];

  return (
    <Widget
      title="ATTENTION"
      subtitle="What to focus on right now"
      action={{ label: 'Refresh', onClick: () => setItems(null) }}
      actions={widgetActions}
    >
      {error && (
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          {error}
        </p>
      )}

      {!error && items === null && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-lg animate-pulse"
              style={{ background: 'var(--glass)' }}
            />
          ))}
        </div>
      )}

      {!error && items && items.length === 0 && (
        <div className="text-center py-8">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
            }}
          >
            <span style={{ color: 'var(--brand)' }}>&#10003;</span>
          </div>
          <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
            Nothing urgent
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
            All systems healthy, no unread signals
          </p>
        </div>
      )}

      {!error && items && items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className="glass float block p-3 group transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Kind badge */}
                <div
                  className="flex-shrink-0 w-11 text-center py-1 rounded-md text-[9px] tracking-[0.1em] font-light"
                  style={{
                    background: `${KIND_COLOR[item.kind]}14`,
                    border: `1px solid ${KIND_COLOR[item.kind]}33`,
                    color: KIND_COLOR[item.kind],
                  }}
                >
                  {KIND_LABEL[item.kind]}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-0.5">
                    <p
                      className="text-xs font-light truncate group-hover:text-white transition-colors"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {item.title}
                    </p>
                    <span
                      className="text-[10px] flex-shrink-0"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className="text-[10px] truncate flex-1"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {item.reason} · {item.environmentName}
                    </p>
                  </div>
                  {/* Attention bar */}
                  <div
                    className="h-[3px] rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.score}%`,
                        background: scoreColor(item.score),
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>

                {/* Score */}
                <div
                  className="flex-shrink-0 text-xs font-extralight tabular-nums"
                  style={{ color: scoreColor(item.score) }}
                >
                  {item.score}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Widget>
  );
}
