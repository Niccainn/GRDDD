'use client';

/**
 * ExceptionsWidget — the what-needs-attention feed. Ranked by
 * severity (urgent > high > medium), not date. This is the "one list
 * the COO wants every morning."
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DataOriginTag from '@/components/widgets/DataOriginTag';
import HelpBubble from '@/components/ui/HelpBubble';

type Row = {
  id: string;
  kind: 'signal' | 'failure' | 'goal';
  title: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  createdAt: string;
  systemName: string | null;
  systemColor: string | null;
  href: string;
};

const KIND_LABEL: Record<Row['kind'], string> = {
  signal: 'Signal',
  failure: 'Execution',
  goal: 'Goal',
};

const SEV_COLOR: Record<Row['severity'], string> = {
  urgent: '#FF6B6B',
  high: '#F5D76E',
  medium: '#7193ED',
  low: '#8B9AA8',
};

export default function ExceptionsWidget({ environmentId }: { environmentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/environments/${environmentId}/exceptions`)
      .then(r => r.json())
      .then(d => {
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p
            className="text-[10px] tracking-[0.18em] uppercase font-light"
            style={{ color: 'var(--text-3)' }}
          >
            What needs attention
          </p>
          <HelpBubble
            title="Exceptions feed"
            body="Ranked by severity, not date. Unions high-priority signals, failed executions, and at-risk goals into one list. The thing a COO would want every morning."
          />
        </div>
        <div className="flex items-center gap-2">
          <DataOriginTag
            sources={['Signal', 'Execution (failed)', 'Goal (at risk)']}
            computed="Unioned then ranked by severity (urgent > high > medium), recency as tie-break."
          />
          <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
            {loading ? '' : rows.length === 0 ? 'All clear' : `${rows.length} open`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 py-4">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8F26B' }} />
          <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
            No exceptions this week. Nothing blocking the team.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map(r => (
            <Link
              key={r.id}
              href={r.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: SEV_COLOR[r.severity] }}
              />
              <span className="flex-1 text-xs font-light truncate" style={{ color: 'var(--text-1)' }}>
                {r.title}
              </span>
              <span
                className="text-[10px] font-light tracking-wider uppercase flex-shrink-0"
                style={{ color: 'var(--text-3)' }}
              >
                {KIND_LABEL[r.kind]}
              </span>
              {r.systemName && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  {r.systemColor && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.systemColor }} />
                  )}
                  <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                    {r.systemName}
                  </span>
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
