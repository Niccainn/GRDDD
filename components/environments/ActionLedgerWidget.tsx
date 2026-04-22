'use client';

/**
 * ActionLedgerWidget — "last 20 things Nova did here." This is the
 * trust layer made visible on the page itself. Clicking any row
 * opens the WhyDrawer with the full trace.
 */

import { useEffect, useState } from 'react';
import WhyDrawer from './WhyDrawer';
import DataOriginTag from '@/components/widgets/DataOriginTag';

type Row = {
  id: string;
  source: 'nova' | 'audit';
  action: string;
  summary: string;
  actor: string | null;
  createdAt: string;
  systemName: string | null;
  systemColor: string | null;
  reversible: boolean;
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActionLedgerWidget({ environmentId }: { environmentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/environments/${environmentId}/actions?limit=15`)
      .then(r => r.json())
      .then(d => {
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  return (
    <>
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[10px] tracking-[0.18em] uppercase font-light"
            style={{ color: 'var(--text-3)' }}
          >
            Action ledger
          </p>
          <div className="flex items-center gap-2">
            <DataOriginTag
              sources={['IntelligenceLog', 'AuditLog (high-signal actions)']}
              computed="Unioned, sorted by recency. Click any row to see the full trace (reasoning, tools called, tokens, cost)."
            />
            <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
              Click any row · Nova explains
            </span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            No recorded actions in this Environment yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {rows.map(r => {
              const isUndone = undone.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => setOpenId(r.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group"
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                  style={{ opacity: isUndone ? 0.45 : 1 }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: r.source === 'nova' ? '#BF9FF1' : r.systemColor || 'var(--text-3)',
                    }}
                  />
                  <span
                    className="flex-1 text-xs font-light truncate"
                    style={{
                      color: 'var(--text-2)',
                      textDecoration: isUndone ? 'line-through' : 'none',
                    }}
                  >
                    {r.summary}
                  </span>
                  {isUndone && (
                    <span
                      className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{ color: '#FF8C8C', background: 'rgba(255,107,107,0.06)' }}
                    >
                      Undone
                    </span>
                  )}
                  <span className="text-[10px] font-light flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    {r.actor}
                  </span>
                  <span className="text-[10px] font-light flex-shrink-0 w-14 text-right" style={{ color: 'var(--text-3)' }}>
                    {relativeTime(r.createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <WhyDrawer
        actionId={openId}
        environmentId={environmentId}
        onClose={() => setOpenId(null)}
        onUndone={id => setUndone(prev => new Set(prev).add(id))}
      />
    </>
  );
}
