'use client';

import { useState, useEffect } from 'react';

type Driver = {
  driver: string;
  impact: number;
  direction: 'positive' | 'negative';
};

type StagePerf = {
  stageId: string;
  stageName: string;
  averageScore: number | null;
  rewriteRate: number;
  criticalRate: number;
  reviewCount: number;
};

type RunSummary = {
  executionId: string;
  score: number;
  inputPreview: string;
  inputLength: number;
  inputQuality: number | null;
  criticalStageId: string | null;
  createdAt: string;
};

type ScoreTrend = {
  date: string;
  score: number;
};

type AttributionData = {
  ready: boolean;
  reviewCount: number;
  minimumRequired?: number;
  message?: string;
  workflowName?: string;
  averageScore?: number;
  drivers?: Driver[];
  stagePerformance?: StagePerf[];
  bestRuns?: RunSummary[];
  worstRuns?: RunSummary[];
  scoreTrend?: ScoreTrend[];
};

type Props = {
  workflowId: string;
  className?: string;
};

export default function AttributionPanel({ workflowId, className = '' }: Props) {
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/attribution`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workflowId]);

  if (loading) {
    return (
      <div className={`glass-deep p-5 animate-fade-in ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--info)' }} />
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Loading attribution...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.ready) {
    return (
      <div className={`glass-deep p-5 animate-fade-in ${className}`}>
        <h3 className="text-xs tracking-[0.12em] font-light mb-3" style={{ color: 'var(--text-3)' }}>
          OUTCOME ATTRIBUTION
        </h3>
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {data?.message || 'Not enough data yet'}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((data?.reviewCount || 0) / (data?.minimumRequired || 3)) * 100}%`,
                background: 'var(--brand)',
              }}
            />
          </div>
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
            {data?.reviewCount || 0}/{data?.minimumRequired || 3} reviews
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-deep p-5 animate-fade-in ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
            OUTCOME ATTRIBUTION
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {data.workflowName} &middot; {data.reviewCount} reviewed runs &middot; avg&nbsp;
            <span className="stat-number" style={{
              color: (data.averageScore || 0) >= 7 ? 'var(--brand)' : (data.averageScore || 0) >= 5 ? 'var(--warning)' : 'var(--danger)',
            }}>
              {data.averageScore}
            </span>/10
          </p>
        </div>
      </div>

      {/* Quality Drivers */}
      {data.drivers && data.drivers.length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] tracking-[0.08em] font-light block mb-2" style={{ color: 'var(--text-3)' }}>
            WHAT DRIVES QUALITY
          </span>
          <div className="space-y-1.5">
            {data.drivers.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2"
                style={{
                  background: d.direction === 'positive' ? 'rgba(21,173,112,0.04)' : 'rgba(255,87,87,0.04)',
                  border: `1px solid ${d.direction === 'positive' ? 'rgba(21,173,112,0.1)' : 'rgba(255,87,87,0.1)'}`,
                  borderRadius: '6px',
                }}
              >
                <span className="text-xs" style={{ color: d.direction === 'positive' ? 'var(--brand)' : 'var(--danger)' }}>
                  {d.direction === 'positive' ? '↑' : '↓'}
                </span>
                <span className="text-[11px] font-light flex-1" style={{ color: 'var(--text-2)' }}>
                  {d.driver}
                </span>
                <span className="stat-number text-xs" style={{
                  color: d.direction === 'positive' ? 'var(--brand)' : 'var(--danger)',
                }}>
                  {d.direction === 'positive' ? '+' : '-'}{d.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Performance */}
      {data.stagePerformance && data.stagePerformance.length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] tracking-[0.08em] font-light block mb-2" style={{ color: 'var(--text-3)' }}>
            STAGE PERFORMANCE
          </span>
          <div className="space-y-1">
            {data.stagePerformance.map(stage => (
              <div
                key={stage.stageId}
                className="flex items-center gap-3 p-2"
                style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}
              >
                <span className="text-[10px] font-light w-24 truncate" style={{ color: 'var(--text-2)' }}>
                  {stage.stageName}
                </span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((stage.averageScore || 0) / 10) * 100}%`,
                      background: (stage.averageScore || 0) >= 7 ? 'var(--brand)' : (stage.averageScore || 0) >= 5 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  />
                </div>
                <span className="stat-number text-[10px] w-6 text-right" style={{
                  color: (stage.averageScore || 0) >= 7 ? 'var(--brand)' : (stage.averageScore || 0) >= 5 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  {stage.averageScore ?? '—'}
                </span>
                {stage.rewriteRate > 30 && (
                  <span className="text-[8px] px-1 py-0.5" style={{
                    background: 'rgba(255,87,87,0.1)',
                    color: 'var(--danger)',
                    borderRadius: '2px',
                  }}>
                    {stage.rewriteRate}% rewrite
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Trend (Mini sparkline) */}
      {data.scoreTrend && data.scoreTrend.length > 2 && (
        <div className="mb-4">
          <span className="text-[10px] tracking-[0.08em] font-light block mb-2" style={{ color: 'var(--text-3)' }}>
            QUALITY OVER TIME
          </span>
          <div className="flex items-end gap-[2px] h-8">
            {data.scoreTrend.map((point, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: `${(point.score / 10) * 100}%`,
                  background: point.score >= 7 ? 'var(--brand)' : point.score >= 5 ? 'var(--warning)' : 'var(--danger)',
                  opacity: 0.4 + (i / data.scoreTrend!.length) * 0.6,
                }}
                title={`${point.score}/10`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Best vs Worst */}
      {data.bestRuns && data.worstRuns && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9px] tracking-[0.08em] font-light block mb-1.5" style={{ color: 'var(--brand)' }}>
              BEST RUNS
            </span>
            {data.bestRuns.slice(0, 2).map(run => (
              <div key={run.executionId} className="mb-1 p-1.5" style={{ background: 'rgba(21,173,112,0.03)', borderRadius: '4px' }}>
                <div className="flex items-center justify-between">
                  <span className="stat-number text-[10px]" style={{ color: 'var(--brand)' }}>{run.score}/10</span>
                  <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>
                    {run.inputLength} chars
                  </span>
                </div>
                <p className="text-[9px] font-light mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                  {run.inputPreview}
                </p>
              </div>
            ))}
          </div>
          <div>
            <span className="text-[9px] tracking-[0.08em] font-light block mb-1.5" style={{ color: 'var(--danger)' }}>
              NEEDS WORK
            </span>
            {data.worstRuns.slice(0, 2).map(run => (
              <div key={run.executionId} className="mb-1 p-1.5" style={{ background: 'rgba(255,87,87,0.03)', borderRadius: '4px' }}>
                <div className="flex items-center justify-between">
                  <span className="stat-number text-[10px]" style={{ color: 'var(--danger)' }}>{run.score}/10</span>
                  <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>
                    {run.inputLength} chars
                  </span>
                </div>
                <p className="text-[9px] font-light mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                  {run.inputPreview}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
