'use client';

import { useState, useEffect } from 'react';
import ExecutionReviewForm from './ExecutionReviewForm';

type DecisionPoint = {
  stageId: string;
  stageName: string;
  decision: string;
  reasoning: string | null;
  impact: 'high' | 'medium' | 'low';
  alternatives: string[] | null;
};

type StageHighlight = {
  stageId: string;
  stageName: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  hasCriticalDecision: boolean;
};

type CheckpointData = {
  executionId: string;
  workflowName: string;
  status: string;
  summary: string;
  criticalDecision: DecisionPoint | null;
  stageHighlights: StageHighlight[];
  decisionPoints: DecisionPoint[];
  completedAt: string | null;
};

type Props = {
  executionId: string;
  onDismiss?: () => void;
};

const IMPACT_COLORS = {
  high: 'var(--danger)',
  medium: 'var(--warning)',
  low: 'var(--text-3)',
};

export default function ExecutionCheckpoint({ executionId, onDismiss }: Props) {
  const [data, setData] = useState<CheckpointData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetch(`/api/executions/${executionId}/checkpoint`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [executionId]);

  if (loading) {
    return (
      <div className="glass-deep p-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--nova)' }} />
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Analyzing execution...
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // If showing review form
  if (showReview) {
    return (
      <ExecutionReviewForm
        executionId={executionId}
        stages={data.stageHighlights.map(s => ({ id: s.stageId, name: s.stageName }))}
        onSubmit={onDismiss}
        onDismiss={() => setShowReview(false)}
      />
    );
  }

  return (
    <div className="glass-deep p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
            COMPREHENSION CHECKPOINT
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {data.workflowName} &middot; {data.summary}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[10px] font-light transition-colors hover:text-white/50"
            style={{ color: 'var(--text-3)' }}
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Critical Decision */}
      {data.criticalDecision && (
        <div
          className="mb-4 p-3"
          style={{
            background: 'rgba(191, 159, 241, 0.06)',
            border: '1px solid rgba(191, 159, 241, 0.15)',
            borderRadius: '8px',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nova)' }} />
            <span className="text-[10px] tracking-[0.1em] font-light" style={{ color: 'var(--nova)' }}>
              THE CRITICAL DECISION
            </span>
          </div>
          <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
            In <span style={{ color: 'var(--nova)' }}>{data.criticalDecision.stageName}</span>:&nbsp;
            {data.criticalDecision.decision}
          </p>
          {data.criticalDecision.reasoning && (
            <p className="text-[10px] mt-1.5 font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
              {data.criticalDecision.reasoning.slice(0, 200)}
              {data.criticalDecision.reasoning.length > 200 ? '...' : ''}
            </p>
          )}
          {data.criticalDecision.alternatives && data.criticalDecision.alternatives.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                Other options:
              </span>
              {data.criticalDecision.alternatives.map((alt, i) => (
                <span
                  key={i}
                  className="text-[9px] px-1.5 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '3px',
                    color: 'var(--text-3)',
                  }}
                >
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage Flow */}
      <div className="mb-4">
        <span className="text-[10px] tracking-[0.08em] font-light block mb-2" style={{ color: 'var(--text-3)' }}>
          STAGE FLOW
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {data.stageHighlights.map((stage, i) => (
            <div key={stage.stageId} className="flex items-center gap-1">
              <div
                className="px-2 py-1.5 text-[10px] font-light whitespace-nowrap"
                style={{
                  background: stage.hasCriticalDecision
                    ? 'rgba(191, 159, 241, 0.1)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    stage.hasCriticalDecision
                      ? 'rgba(191, 159, 241, 0.2)'
                      : 'rgba(255,255,255,0.06)'
                  }`,
                  borderRadius: '4px',
                  color: stage.hasCriticalDecision ? 'var(--nova)' : 'var(--text-2)',
                }}
              >
                {stage.stageName}
                <span className="ml-1.5 text-[8px]" style={{ color: 'var(--text-3)' }}>
                  {stage.tokens > 0 ? `${(stage.tokens / 1000).toFixed(1)}k` : ''}
                </span>
              </div>
              {i < data.stageHighlights.length - 1 && (
                <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Decision Points Summary */}
      {data.decisionPoints.length > 1 && (
        <div className="mb-4">
          <span className="text-[10px] tracking-[0.08em] font-light block mb-2" style={{ color: 'var(--text-3)' }}>
            ALL DECISIONS ({data.decisionPoints.length})
          </span>
          <div className="space-y-1">
            {data.decisionPoints.map((dp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-1.5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                }}
              >
                <div
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: IMPACT_COLORS[dp.impact] }}
                />
                <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                  {dp.stageName}
                </span>
                <span className="text-[10px] font-light flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                  {dp.decision}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA — Evaluate */}
      <button
        onClick={() => setShowReview(true)}
        className="w-full py-2.5 text-xs font-light transition-all"
        style={{
          background: 'rgba(200, 242, 107, 0.08)',
          border: '1px solid rgba(200, 242, 107, 0.2)',
          borderRadius: '6px',
          color: 'var(--brand)',
        }}
      >
        Rate this output
      </button>
    </div>
  );
}
