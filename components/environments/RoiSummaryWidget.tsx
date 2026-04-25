'use client';

/**
 * RoiSummaryWidget — the CFO primitive on the Environment page.
 *
 * Headline: attributed value vs. Nova spend in the window.
 * Secondary: per-system ratio list (sweet spot, review candidates).
 * Footer: count of unattributed goals so the user knows when their
 * number is understated.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DataOriginTag from '@/components/widgets/DataOriginTag';
import HelpBubble from '@/components/ui/HelpBubble';

type PerSystem = {
  systemId: string;
  systemName: string;
  systemColor: string | null;
  cost: number;
  tokens: number;
  calls: number;
  attributedValue: number;
  ratio: number | null;
};

type Roi = {
  windowDays: number;
  generatedAt: string;
  totalValue: number;
  totalCost: number;
  totalTokens: number;
  totalExecutions: number;
  attributedGoals: number;
  unattributedGoals: number;
  ratio: number | null;
  perSystem: PerSystem[];
};

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function RoiSummaryWidget({ environmentId, environmentSlug }: { environmentId: string; environmentSlug: string }) {
  const [data, setData] = useState<Roi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/environments/${environmentId}/roi?days=30`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  const ratio = data?.ratio;
  const sentiment =
    ratio == null ? 'neutral' : ratio >= 5 ? 'positive' : ratio >= 1 ? 'neutral' : 'cautious';

  const sentimentColor =
    sentiment === 'positive' ? '#C8F26B' : sentiment === 'cautious' ? '#FF6B6B' : '#F5D76E';

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p
            className="text-[10px] tracking-[0.18em] uppercase font-light"
            style={{ color: 'var(--text-3)' }}
          >
            ROI · last 30 days
          </p>
          <HelpBubble
            title="ROI attribution"
            body="Goal values parsed from metric labels (hours → $85/hr loaded, $ → direct) against Nova cost from IntelligenceLog. Ratio > 1× means the work paid for itself. Add 'hours' or '$' to Goal metric labels for attribution."
          />
        </div>
        <div className="flex items-center gap-2">
          <DataOriginTag
            sources={['Goal (metric + current)', 'IntelligenceLog.cost']}
            computed='Value: parsed from Goal metric labels ("hours", "$", "revenue") × loaded rate $85/hr. Cost: sum of IntelligenceLog.cost in the window.'
          />
          {data && (
            <Link
              href={`/environments/${environmentSlug}/report`}
              className="text-[11px] font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Monthly report →
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-9 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ) : !data ? (
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          ROI unavailable.
        </p>
      ) : data.attributedGoals === 0 ? (
        <div>
          <p className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>
            Not enough signal to compute ROI yet.
          </p>
          <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Add a Goal whose metric includes <strong>hours</strong>, <strong>$</strong>, or
            <strong> revenue</strong> — GRID reads those units and rolls them up here.
          </p>
          {data.unattributedGoals > 0 && (
            <p className="text-[11px] font-light mt-2" style={{ color: 'var(--text-3)' }}>
              {data.unattributedGoals} existing goal{data.unattributedGoals === 1 ? '' : 's'} could be attributed with a small metric-label edit.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-4 mb-4">
            <span
              className="text-3xl font-extralight tracking-tight"
              style={{ color: sentimentColor, letterSpacing: '-0.02em' }}
            >
              {ratio != null ? `${ratio}×` : '—'}
            </span>
            <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
              {fmtUsd(data.totalValue)} returned on {fmtUsd(data.totalCost)} in Nova cost
            </span>
          </div>
          {(data.perSystem ?? []).length > 0 && (
            <div className="space-y-1 mb-2">
              {(data.perSystem ?? []).slice(0, 4).map(s => (
                <div key={s.systemId} className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: s.systemColor ?? 'var(--text-3)' }}
                  />
                  <span className="text-xs font-light flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                    {s.systemName}
                  </span>
                  <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {fmtUsd(s.attributedValue)} / {fmtUsd(s.cost)}
                    {s.ratio != null && ` · ${s.ratio.toFixed(1)}×`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] font-light mt-3" style={{ color: 'var(--text-3)' }}>
            Based on {data.attributedGoals} attributed goal
            {data.attributedGoals === 1 ? '' : 's'}
            {data.unattributedGoals > 0 && ` · ${data.unattributedGoals} goal${data.unattributedGoals === 1 ? '' : 's'} need a $ or "hours" unit`}.
          </p>
        </>
      )}
    </div>
  );
}
