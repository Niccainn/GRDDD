'use client';

import { useEffect, useState } from 'react';
import Widget from './Widget';

type Reflection = {
  id: string;
  createdAt: string;
  insight: string;
  category: string;
  severity: string;
  metric: string | null;
  metricValue: number | null;
  metricDelta: number | null;
  confidence: number;
  suggestion: string | null;
  acknowledged: boolean;
  actionTaken: string | null;
};

type ReflectiveInsightsWidgetProps = {
  environmentId: string;
};

function severityIcon(severity: string): { symbol: string; color: string } {
  switch (severity) {
    case 'positive': return { symbol: '✦', color: '#15AD70' };
    case 'warning': return { symbol: '⚠', color: '#F7C700' };
    case 'critical': return { symbol: '◆', color: '#FF5757' };
    default: return { symbol: '○', color: '#5B9AFF' };
  }
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function ReflectiveInsightsWidget({ environmentId }: ReflectiveInsightsWidgetProps) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/nova/reflections?environmentId=${environmentId}&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReflections(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  const handleAcknowledge = async (id: string) => {
    await fetch('/api/nova/reflections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setReflections(prev => prev.map(r => r.id === id ? { ...r, acknowledged: true } : r));
  };

  const toggleSuggestion = (id: string) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Summary counts
  const counts: Record<string, number> = {};
  reflections.forEach(r => {
    counts[r.category] = (counts[r.category] || 0) + 1;
  });

  const summaryParts = [
    counts.opportunity && `${counts.opportunity} opportunit${counts.opportunity === 1 ? 'y' : 'ies'}`,
    counts.risk && `${counts.risk} risk${counts.risk === 1 ? '' : 's'}`,
    counts.pattern && `${counts.pattern} pattern${counts.pattern === 1 ? '' : 's'} detected`,
    counts.performance && `${counts.performance} performance`,
    counts.efficiency && `${counts.efficiency} efficiency`,
    counts.anomaly && `${counts.anomaly} anomal${counts.anomaly === 1 ? 'y' : 'ies'}`,
  ].filter(Boolean);

  const visible = expanded ? reflections : reflections.slice(0, 4);

  return (
    <Widget
      title="NOVA INSIGHTS"
      subtitle={summaryParts.join(' \u00b7 ')}
      action={{ label: 'View all \u2192', href: '#' }}
      span={2}
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : reflections.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm font-light" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
            Nova is analyzing your environment. Insights will appear as patterns emerge.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(r => {
            const { symbol, color } = severityIcon(r.severity);
            const showSuggestion = expandedSuggestions.has(r.id);

            return (
              <div
                key={r.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Severity icon */}
                  <span className="text-sm mt-0.5 shrink-0" style={{ color }}>{symbol}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
                        {r.insight}
                      </p>

                      {/* Metric delta badge */}
                      {r.metricDelta !== null && r.metricDelta !== 0 && (
                        <span
                          className="shrink-0 text-xs font-light px-2 py-0.5 rounded-full"
                          style={{
                            background: r.metricDelta > 0 ? 'rgba(21,173,112,0.1)' : 'rgba(255,87,87,0.1)',
                            color: r.metricDelta > 0 ? '#15AD70' : '#FF5757',
                            border: `1px solid ${r.metricDelta > 0 ? 'rgba(21,173,112,0.2)' : 'rgba(255,87,87,0.2)'}`,
                          }}
                        >
                          {r.metricDelta > 0 ? '\u2191' : '\u2193'} {Math.abs(r.metricDelta)}%
                        </span>
                      )}
                    </div>

                    {/* Meta row: category + confidence */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        {categoryLabel(r.category)}
                      </span>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-[2px] rounded-full"
                          style={{
                            width: '40px',
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.confidence * 100}%`,
                              background: 'rgba(255,255,255,0.25)',
                            }}
                          />
                        </div>
                        <span className="text-[9px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </div>

                      {/* Act on this button */}
                      {!r.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(r.id)}
                          className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all"
                          style={{
                            color: '#15AD70',
                            background: 'rgba(21,173,112,0.06)',
                            border: '1px solid rgba(21,173,112,0.15)',
                          }}
                          onMouseEnter={e => {
                            (e.target as HTMLElement).style.background = 'rgba(21,173,112,0.12)';
                          }}
                          onMouseLeave={e => {
                            (e.target as HTMLElement).style.background = 'rgba(21,173,112,0.06)';
                          }}
                        >
                          Act on this
                        </button>
                      )}

                      {r.acknowledged && (
                        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)', opacity: 0.4 }}>
                          Acknowledged
                        </span>
                      )}
                    </div>

                    {/* Expandable suggestion */}
                    {r.suggestion && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleSuggestion(r.id)}
                          className="text-[10px] font-light transition-colors"
                          style={{ color: 'rgba(91,154,255,0.7)' }}
                        >
                          {showSuggestion ? 'Hide suggestion' : 'Nova suggests...'}
                        </button>
                        {showSuggestion && (
                          <p
                            className="text-xs font-light mt-1.5 pl-3 leading-relaxed"
                            style={{
                              color: 'var(--text-2)',
                              borderLeft: '2px solid rgba(91,154,255,0.2)',
                            }}
                          >
                            {r.suggestion}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more / less */}
          {reflections.length > 4 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-center text-[11px] font-light py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-3)' }}
            >
              {expanded ? 'Show less' : `Show ${reflections.length - 4} more`}
            </button>
          )}
        </div>
      )}
    </Widget>
  );
}
