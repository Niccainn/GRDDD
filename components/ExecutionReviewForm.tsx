'use client';

import { useState } from 'react';

type StageReview = {
  stageId: string;
  score: number;
  wouldRewrite: boolean;
  note: string;
};

type Props = {
  executionId: string;
  stages: Array<{ id: string; name: string }>;
  onSubmit?: () => void;
  onDismiss?: () => void;
};

const SCORE_LABELS: Record<number, string> = {
  1: 'Unusable',
  2: 'Poor',
  3: 'Below average',
  4: 'Mediocre',
  5: 'Acceptable',
  6: 'Decent',
  7: 'Good',
  8: 'Strong',
  9: 'Excellent',
  10: 'Perfect',
};

export default function ExecutionReviewForm({ executionId, stages, onSubmit, onDismiss }: Props) {
  const [overallScore, setOverallScore] = useState(7);
  const [overallNotes, setOverallNotes] = useState('');
  const [inputQuality, setInputQuality] = useState<number | null>(null);
  const [criticalStageId, setCriticalStageId] = useState<string | null>(null);
  const [stageReviews, setStageReviews] = useState<StageReview[]>(
    stages.map(s => ({ stageId: s.id, score: 7, wouldRewrite: false, note: '' }))
  );
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateStageReview = (stageId: string, updates: Partial<StageReview>) => {
    setStageReviews(prev =>
      prev.map(sr => (sr.stageId === stageId ? { ...sr, ...updates } : sr))
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/executions/${executionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallScore,
          overallNotes: overallNotes || null,
          stageReviews,
          criticalStageId,
          inputQuality,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        import('@/lib/analytics').then(({ trackEvent }) => {
          trackEvent('funnel.first_review', { score: overallScore });
        }).catch(() => {});
        onSubmit?.();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-deep p-5 animate-fade-in">
        <div className="text-center py-6">
          <div className="text-2xl mb-2" style={{ color: 'var(--brand)' }}>&#10003;</div>
          <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
            Review recorded — {overallScore}/10
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            This evaluation feeds into your mastery insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-deep p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xs tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
            EVALUATE THIS RUN
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Your ratings train the system and build your mastery profile
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[10px] font-light transition-colors hover:text-white/50"
            style={{ color: 'var(--text-3)' }}
          >
            Skip
          </button>
        )}
      </div>

      {/* Overall Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>Overall Quality</span>
          <span className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
            <span className="stat-number text-lg" style={{ color: overallScore >= 7 ? 'var(--brand)' : overallScore >= 5 ? 'var(--warning)' : 'var(--danger)' }}>
              {overallScore}
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--text-3)' }}>/10</span>
            <span className="text-[10px] ml-2" style={{ color: 'var(--text-3)' }}>{SCORE_LABELS[overallScore]}</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={overallScore}
          onChange={e => setOverallScore(parseInt(e.target.value))}
          className="w-full accent-[var(--brand)]"
          style={{ height: '2px' }}
        />
      </div>

      {/* Input Quality */}
      <div className="mb-5">
        <span className="text-xs font-light block mb-2" style={{ color: 'var(--text-2)' }}>
          How good was your brief?
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setInputQuality(inputQuality === n ? null : n)}
              className="flex-1 py-1.5 text-[10px] transition-all"
              style={{
                background: inputQuality === n ? 'rgba(200, 242, 107, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${inputQuality === n ? 'rgba(200, 242, 107, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '4px',
                color: inputQuality === n ? 'var(--brand)' : 'var(--text-3)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>Vague</span>
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>Crystal clear</span>
        </div>
      </div>

      {/* Per-Stage Reviews */}
      {stages.length > 0 && (
        <div className="mb-5">
          <span className="text-xs font-light block mb-2" style={{ color: 'var(--text-2)' }}>
            Stage-by-stage
          </span>
          <div className="space-y-1">
            {stages.map(stage => {
              const sr = stageReviews.find(r => r.stageId === stage.id);
              const isExpanded = expandedStage === stage.id;
              return (
                <div
                  key={stage.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                  }}
                >
                  <button
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    className="w-full flex items-center justify-between p-2.5 text-left"
                  >
                    <span className="text-[11px] font-light" style={{ color: 'var(--text-2)' }}>
                      {stage.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {sr?.wouldRewrite && (
                        <span className="text-[9px] px-1.5 py-0.5" style={{
                          background: 'rgba(255,87,87,0.1)',
                          color: 'var(--danger)',
                          borderRadius: '3px',
                        }}>rewrite</span>
                      )}
                      <span className="stat-number text-xs" style={{
                        color: (sr?.score || 7) >= 7 ? 'var(--brand)' : (sr?.score || 7) >= 5 ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {sr?.score || 7}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {isExpanded ? '−' : '+'}
                      </span>
                    </div>
                  </button>
                  {isExpanded && sr && (
                    <div className="px-2.5 pb-2.5 space-y-2 animate-fade-in">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={sr.score}
                        onChange={e => updateStageReview(stage.id, { score: parseInt(e.target.value) })}
                        className="w-full accent-[var(--brand)]"
                        style={{ height: '2px' }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateStageReview(stage.id, { wouldRewrite: !sr.wouldRewrite })}
                          className="text-[10px] px-2 py-1 transition-all"
                          style={{
                            background: sr.wouldRewrite ? 'rgba(255,87,87,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${sr.wouldRewrite ? 'rgba(255,87,87,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '4px',
                            color: sr.wouldRewrite ? 'var(--danger)' : 'var(--text-3)',
                          }}
                        >
                          Would rewrite
                        </button>
                        <button
                          onClick={() => setCriticalStageId(criticalStageId === stage.id ? null : stage.id)}
                          className="text-[10px] px-2 py-1 transition-all"
                          style={{
                            background: criticalStageId === stage.id ? 'rgba(191,159,241,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${criticalStageId === stage.id ? 'rgba(191,159,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '4px',
                            color: criticalStageId === stage.id ? 'var(--nova)' : 'var(--text-3)',
                          }}
                        >
                          Most impactful
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={sr.note}
                        onChange={e => updateStageReview(stage.id, { note: e.target.value })}
                        className="w-full text-[10px] py-1 px-2 font-light"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '4px',
                          color: 'var(--text-2)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-5">
        <textarea
          placeholder="What would you change about this run?"
          value={overallNotes}
          onChange={e => setOverallNotes(e.target.value)}
          rows={2}
          className="w-full text-xs py-2 px-3 font-light resize-none"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            color: 'var(--text-2)',
            outline: 'none',
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2 text-xs font-light transition-all"
        style={{
          background: 'rgba(200, 242, 107, 0.12)',
          border: '1px solid rgba(200, 242, 107, 0.25)',
          borderRadius: '6px',
          color: 'var(--brand)',
          opacity: submitting ? 0.5 : 1,
        }}
      >
        {submitting ? 'Saving...' : 'Submit Review'}
      </button>
    </div>
  );
}
