'use client';

/**
 * NarrativeWidget — Monday-morning 5-sentence memo for the
 * Environment. Reads GET /api/environments/[id]/narrative; the
 * server caches the result for 24h so re-renders are cheap.
 *
 * Voice: memo, not marketing. This widget is the piece that gets
 * screenshotted into board decks, so it has to read like something
 * a department head would actually send.
 */

import { useEffect, useState } from 'react';
import DataOriginTag from '@/components/widgets/DataOriginTag';
import HelpBubble from '@/components/ui/HelpBubble';

type Props = { environmentId: string; environmentName: string };

type Narrative = {
  text: string;
  generatedAt: string;
  basis: { audits: number; signals: number; goals: number };
  cached: boolean;
};

export default function NarrativeWidget({ environmentId, environmentName }: Props) {
  const [data, setData] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch(`/api/environments/${environmentId}/narrative`)
      .then(r => r.json())
      .then((d: Narrative) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/environments/${environmentId}/narrative?fresh=1`);
      const d = await r.json();
      setData(d);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Weekly narrative · {environmentName}
            </p>
            <HelpBubble
              title="The weekly narrative"
              body="Every Monday Nova writes a five-sentence memo about this Environment — drawn from seven days of audit log, signals, and goal deltas. It's the artifact the team forwards to the CEO."
              learnMoreHref="/blog/week-1"
            />
          </div>
          {data?.generatedAt && (
            <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
              Generated {new Date(data.generatedAt).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {data.cached ? ' · cached' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataOriginTag
            sources={['AuditLog (7d)', 'Signal', 'Goal']}
            computed="Claude writes the 5-sentence summary; stripped of marketing adverbs; cached 24h."
          />
          <button
            onClick={refresh}
            disabled={refreshing || loading}
            className="text-[11px] font-light px-3 py-1 rounded-full transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
              opacity: refreshing || loading ? 0.5 : 1,
            }}
          >
            {refreshing ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : data ? (
        <p
          className="text-base md:text-lg font-extralight leading-relaxed"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}
        >
          {data.text}
        </p>
      ) : (
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          Narrative unavailable right now.
        </p>
      )}
      {data?.basis && (
        <p className="text-[11px] font-light mt-4" style={{ color: 'var(--text-3)' }}>
          Drawn from {data.basis.audits} audited actions · {data.basis.signals} signals · {data.basis.goals} goals
        </p>
      )}
    </div>
  );
}
