'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  type: 'goal_achieved' | 'goal_missed' | 'workflow_milestone' | 'health_change' | 'nova_insight' | 'task_milestone' | 'team_change';
  title: string;
  description: string;
  timestamp: string;
  metric?: string;
};

type HistoryData = {
  timeline: TimelineEvent[];
  healthTrend: { date: string; value: number }[];
  taskVelocity: { week: string; count: number }[];
  aiUsage: { week: string; count: number }[];
};

type Range = '7d' | '30d' | '90d' | 'all';

// ── Event config ─────────────────────────────────────────────────────

const eventConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  goal_achieved: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/></svg>,
    color: '#15AD70',
    label: 'Goal Achieved',
  },
  goal_missed: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/></svg>,
    color: '#FF6B6B',
    label: 'Goal At Risk',
  },
  workflow_milestone: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="12" y="2" width="10" height="10" rx="1" transform="rotate(45 12 2)" strokeLinejoin="round"/></svg>,
    color: '#7193ED',
    label: 'Workflow',
  },
  health_change: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: '#F7C700',
    label: 'Health',
  },
  nova_insight: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: '#BF9FF1',
    label: 'Nova',
  },
  task_milestone: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: '#15AD70',
    label: 'Tasks',
  },
  team_change: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: 'rgba(255,255,255,0.4)',
    label: 'Team',
  },
};

// ── SVG Trend Charts ─────────────────────────────────────────────────

function LineChart({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data yet</div>;

  const w = 480;
  const pad = 8;
  const max = Math.max(...data.map(d => d.value), 1);
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: pad + i * step,
    y: pad + (height - pad * 2) - (d.value / max) * (height - pad * 2),
  }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Gradient fill
  const fillPoints = `${points[0].x},${height - pad} ${polyline} ${points[points.length - 1].x},${height - pad}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#fill-${color.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      {/* End dot */}
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5} fill={color} opacity={0.9} />
      )}
      {/* Axis labels */}
      {data.length > 1 && (
        <>
          <text x={pad} y={height - 1} fontSize="9" fill="var(--text-3)" opacity="0.5">{data[0].label}</text>
          <text x={w - pad} y={height - 1} fontSize="9" fill="var(--text-3)" opacity="0.5" textAnchor="end">{data[data.length - 1].label}</text>
        </>
      )}
    </svg>
  );
}

function BarChartTrend({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data yet</div>;

  const w = 480;
  const pad = 8;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(6, Math.floor((w - pad * 2) / data.length) - 4);
  const gap = Math.floor((w - pad * 2) / data.length) - barW;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - pad * 2 - 12);
        const x = pad + i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={height - pad - barH - 12} width={barW} height={barH} rx={3} fill={color} opacity={0.65} />
          </g>
        );
      })}
      {/* Axis labels */}
      {data.length > 1 && (
        <>
          <text x={pad} y={height - 1} fontSize="9" fill="var(--text-3)" opacity="0.5">{data[0].label}</text>
          <text x={w - pad + (data.length - 1) * (barW + gap)} y={height - 1} fontSize="9" fill="var(--text-3)" opacity="0.5" textAnchor="end">{data[data.length - 1].label}</text>
        </>
      )}
    </svg>
  );
}

// ── Delta indicator ──────────────────────────────────────────────────

function Delta({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const recent = values[values.length - 1];
  const prev = values[Math.max(0, values.length - 2)];
  if (prev === 0) return null;
  const pct = Math.round(((recent - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span style={{
      fontSize: 13,
      fontWeight: 300,
      color: up ? '#15AD70' : '#FF6B6B',
    }}>
      {up ? '\u2191' : '\u2193'}{Math.abs(pct)}%
    </span>
  );
}

// ── Format helpers ───────────────────────────────────────────────────

function fmtWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Timeline Card ────────────────────────────────────────────────────

function TimelineCard({ event, side, visible }: { event: TimelineEvent; side: 'left' | 'right'; visible: boolean }) {
  const config = eventConfig[event.type] ?? eventConfig.team_change;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        paddingLeft: side === 'right' ? 'calc(50% + 20px)' : 0,
        paddingRight: side === 'left' ? 'calc(50% + 20px)' : 0,
        marginBottom: 24,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(0) translateX(0)'
          : side === 'left' ? 'translateY(16px) translateX(20px)' : 'translateY(16px) translateX(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          padding: '16px 20px',
          maxWidth: 380,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
            {fmtTimestamp(event.timestamp)}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontWeight: 300 }}>
            {fmtTime(event.timestamp)}
          </span>
        </div>

        {/* Type badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 20,
          background: `${config.color}15`,
          border: `1px solid ${config.color}30`,
          marginBottom: 10,
        }}>
          <span style={{ color: config.color, display: 'flex' }}>{config.icon}</span>
          <span style={{ fontSize: 11, color: config.color, fontWeight: 400 }}>{config.label}</span>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 15,
          fontWeight: 300,
          color: 'var(--text-1)',
          margin: '0 0 4px',
          lineHeight: 1.4,
        }}>
          {event.title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--text-3)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {event.description}
        </p>

        {/* Metric */}
        {event.metric && (
          <div style={{
            marginTop: 10,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'inline-block',
          }}>
            <span style={{ fontSize: 14, fontWeight: 300, color: config.color, fontVariantNumeric: 'tabular-nums' }}>
              {event.metric}
            </span>
          </div>
        )}

        {/* Connector dot */}
        <div style={{
          position: 'absolute',
          top: 20,
          [side === 'left' ? 'right' : 'left']: -28,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: config.color,
          opacity: 0.6,
          boxShadow: `0 0 8px ${config.color}40`,
        }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function AnalyticsHistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [range, setRange] = useState<Range>('30d');
  const [presentMode, setPresentMode] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetch(`/api/analytics/history?range=${range}`)
      .then(r => r.json())
      .then(setData);
  }, [range]);

  // IntersectionObserver for stagger animation
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-event-id');
            if (id) {
              setVisibleCards((prev) => new Set(prev).add(id));
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    cardRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [data]);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  const ranges: Range[] = ['7d', '30d', '90d', 'all'];
  const rangeLabels: Record<Range, string> = { '7d': '7d', '30d': '30d', '90d': '90d', all: 'All' };

  // Compute current values and deltas
  const currentHealth = data?.healthTrend.length
    ? data.healthTrend[data.healthTrend.length - 1].value
    : null;
  const currentVelocity = data?.taskVelocity.length
    ? data.taskVelocity[data.taskVelocity.length - 1].count
    : null;
  const currentAI = data?.aiUsage.length
    ? data.aiUsage[data.aiUsage.length - 1].count
    : null;

  const baseFontScale = presentMode ? 1.12 : 1;

  return (
    <div
      className="analytics-history"
      style={{
        padding: '40px 48px',
        minHeight: '100vh',
        maxWidth: 960,
        fontSize: `${baseFontScale}rem`,
      }}
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 32 }}>
        <Link
          href="/analytics"
          style={{
            padding: '8px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 300,
            color: 'var(--text-3)',
            background: 'transparent',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          Overview
        </Link>
        <div
          style={{
            padding: '8px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--text-1)',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
          }}
        >
          History
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{
            fontSize: presentMode ? 30 : 26,
            fontWeight: 200,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
            margin: '0 0 6px',
          }}>
            History &amp; Trends
          </h1>
          <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', margin: 0 }}>
            Key events, milestones, and performance trends
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Present mode toggle */}
          <button
            onClick={() => setPresentMode(!presentMode)}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 300,
              color: presentMode ? '#15AD70' : 'var(--text-3)',
              background: presentMode ? 'rgba(21,173,112,0.1)' : 'var(--glass)',
              border: presentMode ? '1px solid rgba(21,173,112,0.25)' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" strokeLinejoin="round" />
              <path d="M8 21h8M12 17v4" strokeLinecap="round" />
            </svg>
            Present
          </button>

          {/* Range selector */}
          <div style={{
            display: 'flex',
            gap: 2,
            padding: 3,
            borderRadius: 10,
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
          }}>
            {ranges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: range === r ? 400 : 300,
                  color: range === r ? 'var(--text-1)' : 'var(--text-3)',
                  background: range === r ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      {!data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse" style={{ background: 'var(--glass)', borderRadius: 16, height: 200 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {/* Health Over Time */}
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '20px 20px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.5)' }}>Health Over Time</span>
              <Delta values={data.healthTrend.map(d => d.value)} />
            </div>
            <div style={{
              fontSize: presentMode ? 36 : 32,
              fontWeight: 200,
              color: '#F7C700',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 12,
              lineHeight: 1,
            }}>
              {currentHealth != null ? `${currentHealth}%` : '--'}
            </div>
            <LineChart
              data={data.healthTrend.map(d => ({ label: fmtWeek(d.date), value: d.value }))}
              color="#F7C700"
              height={100}
            />
          </div>

          {/* Task Velocity */}
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '20px 20px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.5)' }}>Task Velocity</span>
              <Delta values={data.taskVelocity.map(d => d.count)} />
            </div>
            <div style={{
              fontSize: presentMode ? 36 : 32,
              fontWeight: 200,
              color: '#15AD70',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 12,
              lineHeight: 1,
            }}>
              {currentVelocity != null ? currentVelocity : '--'}
              <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', marginLeft: 6 }}>/wk</span>
            </div>
            <BarChartTrend
              data={data.taskVelocity.map(d => ({ label: fmtWeek(d.week), value: d.count }))}
              color="#15AD70"
              height={100}
            />
          </div>

          {/* AI Usage */}
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '20px 20px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.5)' }}>AI Usage</span>
              <Delta values={data.aiUsage.map(d => d.count)} />
            </div>
            <div style={{
              fontSize: presentMode ? 36 : 32,
              fontWeight: 200,
              color: '#BF9FF1',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 12,
              lineHeight: 1,
            }}>
              {currentAI != null ? currentAI : '--'}
              <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', marginLeft: 6 }}>/wk</span>
            </div>
            <LineChart
              data={data.aiUsage.map(d => ({ label: fmtWeek(d.week), value: d.count }))}
              color="#BF9FF1"
              height={100}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: presentMode ? 20 : 17,
          fontWeight: 200,
          color: 'var(--text-1)',
          margin: '0 0 6px',
        }}>
          Timeline
        </h2>
        <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-3)', margin: '0 0 32px' }}>
          Chronological record of key events
        </p>
      </div>

      {!data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="animate-pulse" style={{
              background: 'var(--glass)',
              borderRadius: 14,
              height: 100,
              width: '45%',
              marginLeft: i % 2 === 0 ? 0 : '55%',
            }} />
          ))}
        </div>
      ) : data.timeline.length === 0 ? (
        <div style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>No events yet</p>
          <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-3)', margin: 0 }}>
            Complete tasks, achieve goals, or run workflows to see your timeline populate
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Center line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: 'linear-gradient(to bottom, transparent, var(--glass-border) 5%, var(--glass-border) 95%, transparent)',
            transform: 'translateX(-0.5px)',
          }} />

          {data.timeline.map((event, i) => (
            <div
              key={event.id}
              ref={(el) => setCardRef(event.id, el)}
              data-event-id={event.id}
            >
              <TimelineCard
                event={event}
                side={i % 2 === 0 ? 'left' : 'right'}
                visible={visibleCards.has(event.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          nav, aside, header, .sidebar, [data-sidebar],
          button, a[href="/analytics"] {
            display: none !important;
          }
          .analytics-history {
            padding: 20px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
