'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DailyPoint = { date: string; queries: number; tokens: number };
type ExecPoint  = { date: string; completed: number; failed: number };
type SystemStat = { systemId: string | null; name: string; color: string | null; tokens: number; cost: number; count: number };

type Analytics = {
  summary: {
    totalTokens: number;
    totalCost: number;
    totalQueries: number;
    successRate: number;
    weekTokens: number;
    weekQueries: number;
    execTotal: number;
    execCompleted: number;
    execFailed: number;
    execSuccessRate: number;
  };
  daily: DailyPoint[];
  execDaily: ExecPoint[];
  bySystem: SystemStat[];
};

// ─── Inline sparkline/bar chart via SVG ──────────────────────────────────────

function BarChart({
  data,
  height = 80,
  color = '#15AD70',
  colorB,
  keyA,
  keyB,
}: {
  data: Record<string, number>[];
  height?: number;
  color?: string;
  colorB?: string;
  keyA: string;
  keyB?: string;
}) {
  const maxA = Math.max(...data.map(d => (d[keyA] ?? 0) + (keyB ? (d[keyB] ?? 0) : 0)), 1);
  const barW = Math.max(4, Math.floor(560 / data.length) - 2);
  const gap  = Math.floor(560 / data.length) - barW;
  const w    = data.length * (barW + gap);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const totalH = ((d[keyA] ?? 0) + (keyB ? (d[keyB] ?? 0) : 0)) / maxA * (height - 4);
        const aH     = (d[keyA] ?? 0) / maxA * (height - 4);
        const bH     = totalH - aH;
        const x      = i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={height - aH} width={barW} height={aH} rx={2}
              fill={color} opacity={0.7} />
            {keyB && bH > 0 && (
              <rect x={x} y={height - totalH} width={barW} height={bH} rx={2}
                fill={colorB ?? '#FF6B6B'} opacity={0.65} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({ data, height = 48, color = '#BF9FF1' }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 560;
  const step = w / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData);
  }, []);

  function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const maxTokenSystem = data ? Math.max(...data.bySystem.map(s => s.tokens), 1) : 1;

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-4xl">
      {/* Tab bar */}
      <div className="mb-8" style={{ display: 'flex', gap: 2 }}>
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
          Overview
        </div>
        <Link
          href="/analytics/history"
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
          History
        </Link>
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Analytics</h1>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>AI usage, workflow performance, and operational insights · last 30 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {!data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--glass)', height: 80 }} />
          ))
        ) : (
          [
            { label: 'Total queries', value: fmt(data.summary.totalQueries), sub: `${fmt(data.summary.weekQueries)} this week`, color: '#BF9FF1' },
            { label: 'Tokens used', value: fmt(data.summary.totalTokens), sub: `${fmt(data.summary.weekTokens)} this week`, color: '#7193ED' },
            { label: 'Nova success', value: `${data.summary.successRate}%`, sub: 'query success rate', color: '#15AD70' },
            { label: 'Executions', value: fmt(data.summary.execTotal), sub: `${data.summary.execSuccessRate}% completed`, color: '#F7C700' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-light mb-2" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
              <p className="text-xl md:text-2xl font-extralight tabular-nums mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{stat.sub}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-6">
        {/* Nova queries chart */}
        <div className="rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-light mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Nova queries</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Daily activity over 30 days</p>
            </div>
            {data && (
              <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span>peak {Math.max(...data.daily.map(d => d.queries))}</span>
              </div>
            )}
          </div>
          {!data ? (
            <div className="h-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : (
            <>
              <BarChart data={data.daily as unknown as Record<string, number>[]} keyA="queries" color="#BF9FF1" height={80} />
              <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>{fmtDate(data.daily[0]?.date ?? '')}</span>
                <span>{fmtDate(data.daily[data.daily.length - 1]?.date ?? '')}</span>
              </div>
            </>
          )}
        </div>

        {/* Token usage chart */}
        <div className="rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-light mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Token usage</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Tokens consumed per day</p>
            </div>
          </div>
          {!data ? (
            <div className="h-12 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : (
            <Sparkline data={data.daily.map(d => d.tokens)} color="#7193ED" height={52} />
          )}
        </div>

        {/* Workflow executions chart */}
        <div className="rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-light mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Workflow executions</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Completed vs failed over 30 days</p>
            </div>
            {data && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5" style={{ color: '#15AD70' }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: '#15AD70', opacity: 0.7 }} />
                  {data.summary.execCompleted} completed
                </span>
                <span className="flex items-center gap-1.5" style={{ color: '#FF6B6B' }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: '#FF6B6B', opacity: 0.65 }} />
                  {data.summary.execFailed} failed
                </span>
              </div>
            )}
          </div>
          {!data ? (
            <div className="h-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : (
            <>
              <BarChart data={data.execDaily as unknown as Record<string, number>[]} keyA="completed" keyB="failed" color="#15AD70" colorB="#FF6B6B" height={72} />
              <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>{fmtDate(data.execDaily[0]?.date ?? '')}</span>
                <span>{fmtDate(data.execDaily[data.execDaily.length - 1]?.date ?? '')}</span>
              </div>
            </>
          )}
        </div>

        {/* Token usage by system */}
        {data && data.bySystem.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <div className="px-5 py-4" style={{ background: 'var(--glass)', borderBottom: '1px solid var(--glass-border)' }}>
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>Token usage by system</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>All-time Nova interactions</p>
            </div>
            {data.bySystem.map((s, i) => {
              const pct = Math.round((s.tokens / maxTokenSystem) * 100);
              return (
                <div key={s.systemId ?? i}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={{ background: 'var(--glass)', borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: s.color ?? '#7193ED' }} />
                  <span className="text-sm font-light flex-shrink-0" style={{ color: 'rgba(255,255,255,0.7)', minWidth: 120 }}>
                    {s.name}
                  </span>
                  <div className="flex-1 mx-2">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: s.color ?? '#7193ED', opacity: 0.6 }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>{fmt(s.tokens)} tokens</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{s.count} queries</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {data && data.summary.totalQueries === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No Nova activity yet</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Start a conversation with Nova on any system to see analytics here</p>
          </div>
        )}
      </div>
    </div>
  );
}
