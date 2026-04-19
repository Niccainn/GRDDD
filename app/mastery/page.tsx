'use client';

import { useState, useEffect } from 'react';
import MasteryWidget from '@/components/widgets/MasteryWidget';

type MasteryInsight = {
  id: string;
  principle: string;
  category: string;
  strength: number;
  runsAnalyzed: number;
  workflowId: string | null;
};

type LearningCurvePoint = {
  date: string;
  score: number;
  rollingAverage: number;
};

type MasteryData = {
  insights: MasteryInsight[];
  learningCurve: LearningCurvePoint[];
  totalReviews: number;
  averageScore: number | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  input_pattern: '#7193ED',
  stage_pattern: '#BF9FF1',
  timing_pattern: '#F7C700',
  quality_driver: '#C8F26B',
};

const CATEGORY_LABELS: Record<string, string> = {
  input_pattern: 'Input Pattern',
  stage_pattern: 'Stage Pattern',
  timing_pattern: 'Timing Pattern',
  quality_driver: 'Quality Driver',
};

export default function MasteryPage() {
  const [data, setData] = useState<MasteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Get first available environment
  useEffect(() => {
    fetch('/api/environments')
      .then(r => r.json())
      .then(envs => {
        if (Array.isArray(envs) && envs.length > 0) {
          setEnvironmentId(envs[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!environmentId) return;
    fetch(`/api/mastery?environmentId=${environmentId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  const generateInsights = async () => {
    if (!environmentId) return;
    setGenerating(true);
    try {
      await fetch('/api/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId }),
      });
      // Refresh
      const res = await fetch(`/api/mastery?environmentId=${environmentId}`);
      const d = await res.json();
      setData(d);
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
          <span className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading mastery data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-light" style={{ color: 'var(--text-1)' }}>
            Your Operating Playbook
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'var(--text-3)' }}>
            Patterns derived from {data?.totalReviews || 0} workflow evaluations
          </p>
        </div>
        <button
          onClick={generateInsights}
          disabled={generating}
          className="text-[10px] px-3 py-1.5 font-light transition-all"
          style={{
            background: 'rgba(200, 242, 107, 0.08)',
            border: '1px solid rgba(200, 242, 107, 0.2)',
            borderRadius: '6px',
            color: 'var(--brand)',
            opacity: generating ? 0.5 : 1,
          }}
        >
          {generating ? 'Analyzing...' : 'Refresh Insights'}
        </button>
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="glass-deep p-4">
            <span className="text-[10px] tracking-[0.12em] font-light block" style={{ color: 'var(--text-3)' }}>
              TOTAL REVIEWS
            </span>
            <span className="stat-number text-2xl block mt-1" style={{ color: 'var(--text-1)' }}>
              {data.totalReviews}
            </span>
          </div>
          <div className="glass-deep p-4">
            <span className="text-[10px] tracking-[0.12em] font-light block" style={{ color: 'var(--text-3)' }}>
              AVERAGE SCORE
            </span>
            <span className="stat-number text-2xl block mt-1" style={{
              color: (data.averageScore || 0) >= 7 ? 'var(--brand)' : (data.averageScore || 0) >= 5 ? 'var(--warning)' : 'var(--danger)',
            }}>
              {data.averageScore ?? '—'}
              <span className="text-xs ml-0.5" style={{ color: 'var(--text-3)' }}>/10</span>
            </span>
          </div>
          <div className="glass-deep p-4">
            <span className="text-[10px] tracking-[0.12em] font-light block" style={{ color: 'var(--text-3)' }}>
              INSIGHTS FOUND
            </span>
            <span className="stat-number text-2xl block mt-1" style={{ color: 'var(--nova)' }}>
              {data.insights.length}
            </span>
          </div>
        </div>
      )}

      {/* Learning Curve */}
      {data?.learningCurve && data.learningCurve.length > 2 && (
        <div className="glass-deep p-5 mb-6">
          <h3 className="text-xs tracking-[0.12em] font-light mb-4" style={{ color: 'var(--text-3)' }}>
            YOUR LEARNING CURVE
          </h3>
          <div className="flex items-end gap-[3px] h-16">
            {data.learningCurve.map((point, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all relative group"
                style={{
                  height: `${(point.score / 10) * 100}%`,
                  background: point.score >= 7 ? 'var(--brand)' : point.score >= 5 ? 'var(--warning)' : 'var(--danger)',
                  opacity: 0.3 + (i / data.learningCurve.length) * 0.7,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[8px]" style={{ color: 'var(--text-3)', opacity: 0.4 }}>First review</span>
            <span className="text-[8px]" style={{ color: 'var(--text-3)', opacity: 0.4 }}>Latest</span>
          </div>
          {/* Rolling average trend */}
          {data.learningCurve.length >= 5 && (() => {
            const first = data.learningCurve[0].rollingAverage;
            const last = data.learningCurve[data.learningCurve.length - 1].rollingAverage;
            const delta = last - first;
            return (
              <p className="text-[10px] font-light mt-2" style={{ color: delta > 0 ? 'var(--brand)' : 'var(--danger)' }}>
                {delta > 0 ? '↑' : '↓'} Rolling average moved from {first} to {last}
                &nbsp;({delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10} points)
              </p>
            );
          })()}
        </div>
      )}

      {/* Insights by Category */}
      {data?.insights && data.insights.length > 0 && (
        <div className="space-y-4">
          {Object.entries(
            data.insights.reduce((acc, i) => {
              (acc[i.category] = acc[i.category] || []).push(i);
              return acc;
            }, {} as Record<string, MasteryInsight[]>)
          ).map(([category, categoryInsights]) => (
            <div key={category} className="glass-deep p-5">
              <h3 className="text-xs tracking-[0.12em] font-light mb-3" style={{
                color: CATEGORY_COLORS[category] || 'var(--text-3)',
              }}>
                {CATEGORY_LABELS[category] || category.toUpperCase()}
              </h3>
              <div className="space-y-2">
                {categoryInsights.map(insight => (
                  <div
                    key={insight.id}
                    className="flex items-start gap-3 p-2.5"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                    }}
                  >
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: CATEGORY_COLORS[insight.category] || 'var(--text-3)' }}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
                        {insight.principle}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${insight.strength * 100}%`, background: 'var(--brand)' }}
                            />
                          </div>
                          <span className="text-[8px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                            {Math.round(insight.strength * 100)}% confidence
                          </span>
                        </div>
                        <span className="text-[8px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                          {insight.runsAnalyzed} runs analyzed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!data?.insights || data.insights.length === 0) && (
        <div className="glass-deep p-8 text-center">
          <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
            No mastery insights yet
          </p>
          <p className="text-xs font-light mt-2" style={{ color: 'var(--text-3)' }}>
            Rate at least 3 workflow runs, then click &ldquo;Refresh Insights&rdquo; to generate your operating playbook
          </p>
        </div>
      )}
    </div>
  );
}
