'use client';

import { useEffect, useState, useCallback } from 'react';

type Insight = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  confidence: number;
  sourceDomains: string;
  targetDomains: string;
  evidence: string | null;
  dataPoints: number;
  acknowledged: boolean;
  actionTaken: string | null;
  resolvedAt: string | null;
};

type DomainRef = { type: string; name: string };

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF6B6B',
  warning: '#F7C700',
  positive: '#C8F26B',
  info: '#7193ED',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  risk: 'Risks',
  opportunity: 'Opportunities',
  dependency: 'Dependencies',
  correlation: 'Correlations',
  causation: 'Causations',
};

// Stable domain colors for the visualization
const DOMAIN_COLORS = [
  '#C8F26B', '#7193ED', '#BF9FF1', '#F7C700', '#FF6B6B',
  '#4ECDC4', '#FF8A65', '#AB47BC', '#66BB6A', '#EF5350',
];

function parseDomains(json: string): DomainRef[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function CrossDomainInsights({ className }: { className?: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [actionInsightId, setActionInsightId] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const fetchInsights = useCallback(() => {
    fetch('/api/insights/cross-domain')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInsights(data);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const filtered = activeCategory === 'all'
    ? insights
    : insights.filter(i => i.category === activeCategory);

  // Build unique domains and connections for the visualization
  const domainMap = new Map<string, { name: string; type: string; color: string }>();
  const connections: { source: string; target: string; severity: string; confidence: number; insightId: string }[] = [];

  insights.forEach(insight => {
    const sources = parseDomains(insight.sourceDomains);
    const targets = parseDomains(insight.targetDomains);
    sources.forEach(s => {
      if (!domainMap.has(s.name)) {
        domainMap.set(s.name, { ...s, color: DOMAIN_COLORS[domainMap.size % DOMAIN_COLORS.length] });
      }
    });
    targets.forEach(t => {
      if (!domainMap.has(t.name)) {
        domainMap.set(t.name, { ...t, color: DOMAIN_COLORS[domainMap.size % DOMAIN_COLORS.length] });
      }
    });
    sources.forEach(s => {
      targets.forEach(t => {
        connections.push({
          source: s.name,
          target: t.name,
          severity: insight.severity,
          confidence: insight.confidence,
          insightId: insight.id,
        });
      });
    });
  });

  const domains = Array.from(domainMap.values());

  // Stats
  const totalInsights = insights.length;
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const domainsConnected = domains.length;
  const avgConfidence = insights.length > 0
    ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length * 100)
    : 0;

  async function handleAcknowledge(id: string) {
    await fetch('/api/insights/cross-domain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acknowledged: true }),
    });
    fetchInsights();
  }

  async function handleAction(id: string) {
    if (!actionText.trim()) return;
    await fetch('/api/insights/cross-domain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, actionTaken: actionText.trim() }),
    });
    setActionInsightId(null);
    setActionText('');
    fetchInsights();
  }

  if (!loaded) {
    return (
      <div className={className}>
        <div className="rounded-2xl p-8 animate-pulse" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)',
        }}>
          <div className="h-6 w-64 rounded-lg mb-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="h-32 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className={className}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}>
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              {/* Network graph icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(200,242,107,0.08)',
                border: '1px solid rgba(200,242,107,0.15)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8F26B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <circle cx="6" cy="18" r="2.5" />
                  <circle cx="18" cy="18" r="2.5" />
                  <path d="M8.5 6H15.5" />
                  <path d="M6 8.5V15.5" />
                  <path d="M18 8.5V15.5" />
                  <path d="M8.5 18H15.5" />
                  <path d="M8.5 8.5L15.5 15.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs tracking-[0.15em] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  CROSS-DOMAIN INTELLIGENCE
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Nova found {totalInsights} connection{totalInsights !== 1 ? 's' : ''} across your environments
                </p>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mt-5">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: activeCategory === key ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${activeCategory === key ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  color: activeCategory === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                }}
              >
                {label}
                {key !== 'all' && (() => {
                  const count = insights.filter(i => i.category === key).length;
                  return count > 0 ? ` (${count})` : '';
                })()}
              </button>
            ))}
          </div>
        </div>

        {/* Connection Visualization */}
        {domains.length >= 2 && (
          <div className="px-8 py-6">
            <div className="rounded-xl p-6 relative overflow-hidden" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              {/* Subtle grid background */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />

              <svg width="100%" height="120" viewBox={`0 0 ${Math.max(domains.length * 160, 600)} 120`} className="relative">
                {/* Connection lines */}
                {connections.map((conn, idx) => {
                  const si = domains.findIndex(d => d.name === conn.source);
                  const ti = domains.findIndex(d => d.name === conn.target);
                  if (si === -1 || ti === -1) return null;
                  const totalWidth = Math.max(domains.length * 160, 600);
                  const spacing = totalWidth / (domains.length + 1);
                  const sx = spacing * (si + 1);
                  const tx = spacing * (ti + 1);
                  const sevColor = SEVERITY_COLORS[conn.severity] ?? 'rgba(255,255,255,0.2)';
                  const isSelected = selectedConnection === conn.insightId;
                  const strokeWidth = 1 + conn.confidence * 2;
                  const midY = 20 + Math.abs(ti - si) * 8;

                  return (
                    <g key={idx}>
                      <path
                        d={`M ${sx} 60 Q ${(sx + tx) / 2} ${midY} ${tx} 60`}
                        fill="none"
                        stroke={sevColor}
                        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
                        strokeOpacity={isSelected ? 0.7 : 0.25}
                        strokeLinecap="round"
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        onClick={() => setSelectedConnection(isSelected ? null : conn.insightId)}
                      />
                      {/* Animated pulse on the line */}
                      {isSelected && (
                        <circle r="3" fill={sevColor} opacity="0.8">
                          <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={`M ${sx} 60 Q ${(sx + tx) / 2} ${midY} ${tx} 60`}
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Domain nodes */}
                {domains.map((domain, idx) => {
                  const totalWidth = Math.max(domains.length * 160, 600);
                  const spacing = totalWidth / (domains.length + 1);
                  const cx = spacing * (idx + 1);
                  return (
                    <g key={domain.name}>
                      {/* Outer glow */}
                      <circle cx={cx} cy={60} r={28} fill={domain.color} fillOpacity={0.04} />
                      {/* Node circle */}
                      <circle
                        cx={cx} cy={60} r={20}
                        fill="rgba(0,0,0,0.3)"
                        stroke={domain.color}
                        strokeWidth="1.5"
                        strokeOpacity={0.4}
                      />
                      {/* Inner dot */}
                      <circle cx={cx} cy={60} r={4} fill={domain.color} fillOpacity={0.6} />
                      {/* Label */}
                      <text
                        x={cx} y={98}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.45)"
                        fontSize="10"
                        fontWeight="300"
                        fontFamily="inherit"
                      >
                        {domain.name}
                      </text>
                      {/* Type label */}
                      <text
                        x={cx} y={110}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.18)"
                        fontSize="8"
                        fontWeight="300"
                        fontFamily="inherit"
                      >
                        {domain.type}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 px-8 pb-4">
          {[
            { label: 'Total Insights', value: totalInsights.toString(), color: 'rgba(255,255,255,0.5)' },
            { label: 'Critical', value: criticalCount.toString(), color: criticalCount > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.2)' },
            { label: 'Domains Connected', value: domainsConnected.toString(), color: '#C8F26B' },
            { label: 'Avg Confidence', value: `${avgConfidence}%`, color: '#7193ED' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl px-4 py-3" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <p className="text-[10px] tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
              <p className="stat-number text-lg" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Insight Cards */}
        <div className="px-8 pb-8 space-y-3 mt-2">
          {filtered.map(insight => {
            const sources = parseDomains(insight.sourceDomains);
            const targets = parseDomains(insight.targetDomains);
            const sevColor = SEVERITY_COLORS[insight.severity] ?? 'rgba(255,255,255,0.3)';
            const isHighlighted = selectedConnection === insight.id;

            return (
              <div
                key={insight.id}
                id={`insight-${insight.id}`}
                className="rounded-xl transition-all"
                style={{
                  background: isHighlighted
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHighlighted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                }}
              >
                <div className="px-5 py-4">
                  {/* Top row: severity badge + title */}
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-[10px] font-medium tracking-wide px-2.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{
                      background: `${sevColor}12`,
                      border: `1px solid ${sevColor}30`,
                      color: sevColor,
                    }}>
                      {insight.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {insight.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs leading-relaxed mb-3 ml-[calc(0.625rem+0.75rem+1.25rem)]" style={{
                    color: 'rgba(255,255,255,0.4)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {insight.description}
                  </p>

                  {/* Connection flow */}
                  <div className="flex items-center gap-2 mb-3 ml-[calc(0.625rem+0.75rem+1.25rem)]">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Connecting:</span>
                    {sources.map((s, i) => {
                      const dm = domainMap.get(s.name);
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dm?.color ?? 'rgba(255,255,255,0.3)' }} />
                          <span className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {s.name}
                          </span>
                        </span>
                      );
                    })}
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M0 4H10M10 4L7 1M10 4L7 7" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {targets.map((t, i) => {
                      const dm = domainMap.get(t.name);
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dm?.color ?? 'rgba(255,255,255,0.3)' }} />
                          <span className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {t.name}
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Confidence meter + data points */}
                  <div className="flex items-center gap-4 mb-3 ml-[calc(0.625rem+0.75rem+1.25rem)]">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Confidence</span>
                      <div className="flex-1 h-1 rounded-full max-w-[120px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${insight.confidence * 100}%`,
                            background: `linear-gradient(90deg, ${sevColor}60, ${sevColor})`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Based on {insight.dataPoints.toLocaleString()} data points
                    </span>
                  </div>

                  {/* Actions + timestamp */}
                  <div className="flex items-center justify-between ml-[calc(0.625rem+0.75rem+1.25rem)]">
                    <div className="flex items-center gap-2">
                      {!insight.acknowledged && !insight.actionTaken && (
                        <button
                          onClick={() => handleAcknowledge(insight.id)}
                          className="text-[11px] font-light px-3 py-1.5 rounded-lg transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.4)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                      {insight.acknowledged && !insight.actionTaken && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full" style={{
                          background: 'rgba(200,242,107,0.08)',
                          border: '1px solid rgba(200,242,107,0.15)',
                          color: 'rgba(200,242,107,0.6)',
                        }}>
                          Acknowledged
                        </span>
                      )}
                      {!insight.actionTaken && actionInsightId !== insight.id && (
                        <button
                          onClick={() => setActionInsightId(insight.id)}
                          className="text-[11px] font-light px-3 py-1.5 rounded-lg transition-all"
                          style={{
                            background: 'rgba(200,242,107,0.06)',
                            border: '1px solid rgba(200,242,107,0.15)',
                            color: 'rgba(200,242,107,0.6)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(200,242,107,0.12)';
                            e.currentTarget.style.borderColor = 'rgba(200,242,107,0.25)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(200,242,107,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(200,242,107,0.15)';
                          }}
                        >
                          Take Action
                        </button>
                      )}
                      {insight.actionTaken && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full" style={{
                          background: 'rgba(200,242,107,0.08)',
                          border: '1px solid rgba(200,242,107,0.15)',
                          color: 'rgba(200,242,107,0.6)',
                        }}>
                          Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                      {timeAgo(insight.createdAt)}
                    </span>
                  </div>

                  {/* Action input (shown when "Take Action" is clicked) */}
                  {actionInsightId === insight.id && (
                    <div className="flex items-center gap-2 mt-3 ml-[calc(0.625rem+0.75rem+1.25rem)]">
                      <input
                        type="text"
                        placeholder="Describe the action taken..."
                        value={actionText}
                        onChange={e => setActionText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAction(insight.id); }}
                        autoFocus
                        className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      />
                      <button
                        onClick={() => handleAction(insight.id)}
                        className="text-[11px] px-3 py-2 rounded-lg transition-all"
                        style={{
                          background: 'rgba(200,242,107,0.15)',
                          border: '1px solid rgba(200,242,107,0.3)',
                          color: '#C8F26B',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setActionInsightId(null); setActionText(''); }}
                        className="text-[11px] px-2 py-2 rounded-lg"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
