'use client';

/**
 * /memory — institutional memory.
 *
 * Organization-wide view of everything Nova has learned across all
 * Environments the caller can see: user-taught memories, Nova-
 * observed patterns, Mastery insights derived from workflow runs.
 *
 * The page title is deliberately "What your company has learned"
 * — not "Nova's memory" — because the point is that the knowledge
 * belongs to the organization, not the agent.
 */

import { useEffect, useState, useCallback } from 'react';

type Item = {
  id: string;
  source: 'memory' | 'insight';
  type: string;
  category: string | null;
  title: string;
  body: string;
  confidence: number;
  environmentName: string | null;
  environmentColor: string | null;
  updatedAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m}mo ago`;
}

export default function MemoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', '80');
    fetch(`/api/memory?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d.items) ? d.items : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 180);
    return () => clearTimeout(t);
  }, [load]);

  const bySource = items.reduce(
    (acc, it) => {
      acc[it.source]++;
      return acc;
    },
    { memory: 0, insight: 0 } as Record<'memory' | 'insight', number>,
  );

  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
          Institutional memory
        </p>
        <h1
          className="text-3xl md:text-4xl font-extralight tracking-tight mb-2"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
        >
          What your company has learned
        </h1>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          Memories you've taught Nova, patterns Nova has observed, and principles Nova has derived from how work actually runs.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-3)' }}
          >
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search memories and principles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-light focus:outline-none"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          />
        </div>
        <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
          {bySource.memory} memories · {bySource.insight} principles
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            Nothing remembered yet.
          </p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Use Nova once, or answer today's lesson, and it'll start showing up here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              className="px-5 py-4"
              style={{
                borderBottom:
                  i < items.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              <div className="flex items-start gap-3 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{
                    background:
                      it.source === 'insight'
                        ? '#F5D76E'
                        : it.environmentColor ?? '#BF9FF1',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                      {it.title}
                    </p>
                    <span
                      className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: it.source === 'insight' ? '#F5D76E' : '#BF9FF1',
                        background:
                          it.source === 'insight'
                            ? 'rgba(245,215,110,0.08)'
                            : 'rgba(191,159,241,0.08)',
                      }}
                    >
                      {it.source === 'insight' ? 'Principle' : it.type.replace('_', ' ')}
                    </span>
                    {it.category && (
                      <span
                        className="text-[10px] font-light tracking-wider uppercase"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {it.category}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs font-light leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {it.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {it.environmentName && (
                      <span className="flex items-center gap-1 text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        {it.environmentColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: it.environmentColor }}
                          />
                        )}
                        {it.environmentName}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-light"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {timeAgo(it.updatedAt)}
                    </span>
                    <span
                      className="text-[10px] font-light ml-auto"
                      style={{ color: 'var(--text-3)' }}
                    >
                      Confidence {Math.round(it.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
