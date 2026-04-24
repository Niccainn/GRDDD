'use client';

/**
 * TeamAdoptionWidget — CHRO-adjacent view on the Environment page.
 *
 * Shows per-member Trust Score + override rate + review activity. The
 * team-average line anchors the reading: individuals diverging from
 * the cohort are where adoption risk lives.
 *
 * Owner-only data; the endpoint returns 404 for non-owners and the
 * widget hides itself gracefully.
 */

import { useEffect, useState } from 'react';
import DataOriginTag from '@/components/widgets/DataOriginTag';
import HelpBubble from '@/components/ui/HelpBubble';

type Member = {
  identityId: string;
  name: string;
  role: string;
  approvalsTotal: number;
  approvalsApproved: number;
  overrides: number;
  reviews: number;
  overrideRate: number;
  approvalRate: number;
  trustScore: number;
};

type Telemetry = {
  windowDays: number;
  cohort: {
    memberCount: number;
    avgTrust: number;
    avgOverrideRate: number;
    totalApprovals: number;
    totalReviews: number;
  };
  members: Member[];
};

function trustColor(score: number): string {
  if (score >= 80) return '#C8F26B';
  if (score >= 60) return '#F5D76E';
  return '#FF6B6B';
}

export default function TeamAdoptionWidget({ environmentId }: { environmentId: string }) {
  const [data, setData] = useState<Telemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetch(`/api/environments/${environmentId}/team-telemetry`)
      .then(async r => {
        if (r.status === 404) {
          setHidden(true);
          return null;
        }
        return r.json();
      })
      .then(d => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  if (hidden) return null;

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
            Team adoption · last 30 days
          </p>
          <HelpBubble
            title="Team adoption telemetry"
            body="Trust Score + override rate per member. Members diverging > 15 points from the team average get flagged — that's adoption risk surfacing before a rollout stalls. Owner-only view."
          />
        </div>
        <div className="flex items-center gap-2">
          <DataOriginTag
            sources={['ApprovalRequest', 'ExecutionReview', 'EnvironmentMembership']}
            computed="Trust = 100 − override%. Override% = rejected+changes_requested / total decisions in 30d."
          />
          {data && (
            <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
              Team avg trust {data.cohort.avgTrust}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : !data || data.members.length === 0 ? (
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          No team activity in this window.
        </p>
      ) : (
        <div className="space-y-2">
          {data.members.map(m => {
            const color = trustColor(m.trustScore);
            const divergence = m.trustScore - data.cohort.avgTrust;
            return (
              <div key={m.identityId} className="flex items-center gap-3 px-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-light"
                  style={{
                    background: 'rgba(200,242,107,0.08)',
                    color: '#C8F26B',
                    border: '1px solid rgba(200,242,107,0.15)',
                  }}
                >
                  {m.name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-light truncate" style={{ color: 'var(--text-1)' }}>
                    {m.name}
                    <span className="ml-2 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                      {m.role.toLowerCase()}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] font-light" style={{ color }}>
                      Trust {m.trustScore}
                    </span>
                    <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                      Override {m.overrideRate}%
                    </span>
                    <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                      {m.reviews} review{m.reviews === 1 ? '' : 's'}
                    </span>
                    {Math.abs(divergence) >= 15 && (
                      <span
                        className="text-[10px] font-light tracking-wider uppercase"
                        style={{ color: divergence > 0 ? '#C8F26B' : '#FF6B6B' }}
                      >
                        {divergence > 0 ? '+' : ''}
                        {divergence} vs team
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="h-1 w-20 rounded-full overflow-hidden flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.trustScore}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.members.length > 0 && (
        <p className="text-[11px] font-light mt-4" style={{ color: 'var(--text-3)' }}>
          {data.cohort.totalApprovals} approval decision{data.cohort.totalApprovals === 1 ? '' : 's'} · {data.cohort.totalReviews} review{data.cohort.totalReviews === 1 ? '' : 's'} · computed from ApprovalRequest and ExecutionReview
        </p>
      )}
    </div>
  );
}
