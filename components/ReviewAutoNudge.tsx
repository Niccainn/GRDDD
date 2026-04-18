'use client';

import { useState, useEffect } from 'react';
import ExecutionReviewForm from './ExecutionReviewForm';

type Props = {
  executionId: string;
  workflowId: string;
  stages: Array<{ id: string; name: string }>;
};

/**
 * Auto-nudge modal that appears after workflow execution when the user
 * has 3+ unreviewed runs. Shows a quick-rate prompt first, then the
 * full review form if they engage.
 */
export default function ReviewAutoNudge({ executionId, workflowId, stages }: Props) {
  const [show, setShow] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  useEffect(() => {
    // Check if this workflow has 3+ unreviewed runs
    fetch(`/api/executions/unreviewed?limit=10`)
      .then(r => r.json())
      .then(data => {
        const wfUnreviewed = (data.executions || []).filter(
          (e: { workflowId: string | null }) => e.workflowId === workflowId
        );
        if (wfUnreviewed.length >= 3) {
          setUnreviewedCount(wfUnreviewed.length);
          // Don't show if dismissed this session
          const key = `grid:nudge-dismissed-${workflowId}`;
          if (!sessionStorage.getItem(key)) {
            setShow(true);
          }
        }
      })
      .catch(() => {});
  }, [workflowId]);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(`grid:nudge-dismissed-${workflowId}`, '1');
  };

  if (!show) return null;

  // Full review form
  if (showFullForm) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={dismiss}
      >
        <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
          <ExecutionReviewForm
            executionId={executionId}
            stages={stages}
            onSubmit={dismiss}
            onDismiss={dismiss}
          />
        </div>
      </div>
    );
  }

  // Quick nudge prompt
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm glass-deep p-6 animate-fade-in text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.2)' }}>
          <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L8 4.5L12 5L9 8L10 12L6 10L2 12L3 8L0 5L4 4.5L6 1Z" stroke="#15AD70" strokeWidth="1" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>
          {unreviewedCount} runs without feedback
        </p>
        <p className="text-xs font-light mb-5" style={{ color: 'var(--text-3)' }}>
          Rating your output helps Nova learn your standards and builds your operating playbook
        </p>
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 text-xs font-light rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            Later
          </button>
          <button
            onClick={() => setShowFullForm(true)}
            className="flex-1 py-2.5 text-xs font-light rounded-lg transition-all"
            style={{ background: 'rgba(21,173,112,0.12)', border: '1px solid rgba(21,173,112,0.25)', color: 'var(--brand)' }}
          >
            Rate this run
          </button>
        </div>
      </div>
    </div>
  );
}
