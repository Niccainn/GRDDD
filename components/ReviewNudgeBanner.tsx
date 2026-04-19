'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type UnreviewedExecution = {
  id: string;
  inputPreview: string;
  systemName: string;
  systemColor: string | null;
  workflowName: string | null;
  workflowId: string | null;
  createdAt: string;
};

export default function ReviewNudgeBanner({ environmentId }: { environmentId?: string }) {
  const [executions, setExecutions] = useState<UnreviewedExecution[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = 'grid:review-nudge-dismissed';
    if (sessionStorage.getItem(key)) { setDismissed(true); setLoading(false); return; }

    const url = environmentId
      ? `/api/executions/unreviewed?environmentId=${environmentId}&limit=3`
      : '/api/executions/unreviewed?limit=3';

    fetch(url)
      .then(r => r.json())
      .then(d => { setExecutions(d.executions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('grid:review-nudge-dismissed', '1');
  };

  if (loading || dismissed || executions.length === 0) return null;

  return (
    <div
      className="mb-6 px-5 py-4 rounded-xl animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(21,173,112,0.04), rgba(191,159,241,0.03))',
        border: '1px solid rgba(21,173,112,0.12)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(21,173,112,0.1)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L8 4.5L12 5L9 8L10 12L6 10L2 12L3 8L0 5L4 4.5L6 1Z" stroke="#15AD70" strokeWidth="1" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
              {executions.length} run{executions.length !== 1 ? 's' : ''} waiting for your feedback
            </p>
            <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
              Reviewing builds your operating playbook
            </p>
          </div>
        </div>
        <button onClick={dismiss} className="text-xs p-1 transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
          &times;
        </button>
      </div>
      <div className="space-y-1">
        {executions.map(exec => (
          <Link
            key={exec.id}
            href={`/workflows/${exec.workflowId || ''}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg group transition-all"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: exec.systemColor || 'var(--brand)' }} />
            <span className="text-[11px] font-light truncate flex-1 group-hover:text-white/80 transition-colors" style={{ color: 'var(--text-2)' }}>
              {exec.workflowName || exec.inputPreview}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{exec.systemName}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(21,173,112,0.1)', color: 'var(--brand)' }}>
              Review →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
