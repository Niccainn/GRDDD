'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import ConfidenceChip from '@/components/ConfidenceChip';

type MasteryInsight = {
  id: string;
  principle: string;
  category: string;
  strength: number;
  runsAnalyzed: number;
  workflowId: string | null;
};

type Props = {
  environmentId: string;
  className?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  input_pattern: '#7193ED',
  stage_pattern: '#BF9FF1',
  timing_pattern: '#F7C700',
  quality_driver: '#C8F26B',
};

const CATEGORY_LABELS: Record<string, string> = {
  input_pattern: 'INPUT',
  stage_pattern: 'STAGE',
  timing_pattern: 'TIMING',
  quality_driver: 'QUALITY',
};

export default function MasteryWidget({ environmentId, className = '' }: Props) {
  const [insights, setInsights] = useState<MasteryInsight[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mastery?environmentId=${environmentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.insights) setInsights(data.insights);
        if (data.totalReviews !== undefined) setTotalReviews(data.totalReviews);
        if (data.averageScore !== undefined) setAverageScore(data.averageScore);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  if (loading) {
    return (
      <Widget title="YOUR OPERATING PLAYBOOK" className={className}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Loading...</span>
        </div>
      </Widget>
    );
  }

  if (insights.length === 0) {
    return (
      <Widget
        title="YOUR OPERATING PLAYBOOK"
        subtitle={`${totalReviews} reviews recorded`}
        className={className}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {totalReviews < 3
              ? `Rate ${3 - totalReviews} more workflow runs to generate your playbook`
              : 'Generating insights...'}
          </p>
        </div>
      </Widget>
    );
  }

  return (
    <Widget
      title="YOUR OPERATING PLAYBOOK"
      subtitle={`${totalReviews} reviews · avg ${averageScore}/10`}
      action={{ label: 'View all', href: '/mastery' }}
      className={className}
    >
      <div className="space-y-2">
        {insights.slice(0, 5).map(insight => (
          <div
            key={insight.id}
            className="p-2"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '6px',
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {insight.principle}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[8px] px-1.5 py-0.5 tracking-[0.08em]"
                    style={{
                      background: `${CATEGORY_COLORS[insight.category] || 'rgba(255,255,255,0.1)'}15`,
                      color: CATEGORY_COLORS[insight.category] || 'var(--text-3)',
                      borderRadius: '3px',
                    }}
                  >
                    {CATEGORY_LABELS[insight.category] || insight.category.toUpperCase()}
                  </span>
                  <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>
                    {insight.runsAnalyzed} runs
                  </span>
                </div>
              </div>
              {/* Confidence chip — uses calibrated tier bands per
                  Hendrycks et al. (2021) so users read the score
                  accurately rather than treating "57%" as "fine". */}
              <ConfidenceChip
                score={insight.strength}
                reason={`Built from ${insight.runsAnalyzed} run${insight.runsAnalyzed === 1 ? '' : 's'} of execution data.`}
                className="flex-shrink-0"
              />
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}
