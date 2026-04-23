'use client';

/**
 * FromPromptModal — the "generate a workflow from a prompt" modal
 * that lives inside the visual builder. Calls the shared planner
 * (same one Projects use) and hands back { nodes, edges } for the
 * canvas to replace or extend.
 */

import { useState } from 'react';
import type { WFNode, WFEdge } from '@/lib/workflows/from-prompt';

type Props = {
  open: boolean;
  onClose: () => void;
  onAccept: (
    nodes: WFNode[],
    edges: WFEdge[],
    mode: 'replace' | 'append',
  ) => void;
};

const STARTERS = [
  'Onboard a new client end-to-end',
  'Design a Meta ad campaign for a new feature',
  'Ship a launch announcement across email + Slack',
  'Run a weekly content pipeline',
];

export default function FromPromptModal({ open, onClose, onAccept }: Props) {
  const [goal, setGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    nodes: WFNode[];
    edges: WFEdge[];
    source: string;
    stepCount: number;
  } | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [error, setError] = useState('');

  if (!open) return null;

  async function plan() {
    if (!goal.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/workflows/from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Planner error');
        return;
      }
      setPreview(data);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  function accept() {
    if (!preview) return;
    onAccept(preview.nodes, preview.edges, mode);
    setGoal('');
    setPreview(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl p-6"
        style={{
          background: 'rgba(12,12,18,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <p
          className="text-[10px] tracking-[0.18em] uppercase font-light mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          Generate workflow from prompt
        </p>
        <h2
          className="text-xl font-extralight mb-2"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}
        >
          Tell Nova what this workflow should do
        </h2>
        <p className="text-xs font-light leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
          Nova will propose an ordered plan. You'll be able to edit any step in the inspector before you save.
        </p>

        {!preview ? (
          <>
            <textarea
              autoFocus
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. Onboard a new client — summarize the intake, create a Notion page, draft a kickoff email."
              rows={3}
              className="w-full text-sm font-light px-4 py-3 rounded-xl focus:outline-none mb-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-1)',
                resize: 'vertical',
              }}
            />
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setGoal(s)}
                  className="text-[11px] font-light px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-3)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && (
              <p className="text-[11px] font-light mb-3" style={{ color: '#FF8C8C' }}>
                {error}
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="text-xs font-light"
                style={{ color: 'var(--text-3)' }}
              >
                Cancel
              </button>
              <button
                onClick={plan}
                disabled={submitting || !goal.trim()}
                className="text-sm font-light px-5 py-2 rounded-xl disabled:opacity-40"
                style={{
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand)',
                }}
              >
                {submitting ? 'Nova is planning…' : 'Plan →'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] font-light mb-2" style={{ color: 'var(--text-3)' }}>
              {preview.source === 'nova'
                ? `Nova planned ${preview.stepCount} steps.`
                : preview.source === 'heuristic'
                ? `Template plan: ${preview.stepCount} steps (no Claude key configured).`
                : `Fallback plan: ${preview.stepCount} steps.`}
            </p>
            <div
              className="rounded-xl p-3 mb-4 max-h-64 overflow-y-auto"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {preview.nodes
                .filter(n => n.type !== 'start' && n.type !== 'end')
                .map((n, i) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 py-1.5"
                    style={{
                      borderBottom:
                        i < preview.nodes.length - 3
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-light"
                      style={{
                        background: 'rgba(200,242,107,0.06)',
                        color: '#C8F26B',
                        border: '1px solid rgba(200,242,107,0.18)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
                        {n.label}
                      </p>
                      {n.description && (
                        <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                          {n.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {n.location && <Tag label={n.location} />}
                        {n.action && <Tag label={n.action} />}
                        {n.approvalRequired && <Tag label="HITL" color="#F5D76E" />}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {(['replace', 'append'] as const).map(m => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className="text-[11px] font-light px-3 py-1 rounded-full"
                      style={{
                        background: active ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(200,242,107,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#C8F26B' : 'var(--text-2)',
                      }}
                    >
                      {m === 'replace' ? 'Replace canvas' : 'Append to canvas'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPreview(null)}
                className="text-xs font-light"
                style={{ color: 'var(--text-3)' }}
              >
                ← Edit prompt
              </button>
              <button
                onClick={accept}
                className="text-sm font-light px-5 py-2 rounded-xl"
                style={{
                  background: 'rgba(200,242,107,0.15)',
                  border: '1px solid rgba(200,242,107,0.3)',
                  color: '#C8F26B',
                }}
              >
                Use this plan →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tag({ label, color = 'rgba(255,255,255,0.35)' }: { label: string; color?: string }) {
  return (
    <span
      className="text-[9px] font-light tracking-wider uppercase px-1.5 py-0.5 rounded-full"
      style={{
        color,
        background: `${color === 'rgba(255,255,255,0.35)' ? 'rgba(255,255,255,0.04)' : color + '14'}`,
        border: `1px solid ${color === 'rgba(255,255,255,0.35)' ? 'rgba(255,255,255,0.08)' : color + '28'}`,
      }}
    >
      {label}
    </span>
  );
}
