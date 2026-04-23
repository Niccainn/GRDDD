'use client';

/**
 * NodeInspector — right-side drawer that opens when a node is
 * selected in the visual Workflow builder. This is where the
 * "manual Zapier takeover" happens: each card gets a title, a
 * description, an integration picker, an interaction pattern, and
 * a Nova prompt. Edits write back to the parent's node state and
 * (optionally) record a NovaMemory entry so the planner learns the
 * pattern for next time.
 */

import { useEffect, useRef, useState } from 'react';

// ─── Taxonomy options (mirrors lib/skills/taxonomy.ts) ────────────

const LOCATION_OPTIONS = [
  'claude_reasoning',
  'human_decision',
  'grid_internal',
  'figma', 'canva', 'adobe_illustrator', 'adobe_photoshop',
  'notion', 'google_docs', 'confluence',
  'slack', 'gmail', 'outlook', 'teams',
  'google_calendar', 'outlook_calendar',
  'google_drive', 'dropbox',
  'meta_ads', 'google_ads', 'linkedin_ads',
  'stripe', 'quickbooks', 'hubspot', 'attio', 'salesforce',
  'linear', 'jira', 'github', 'gitlab',
];

const ACTION_OPTIONS = [
  'fetch', 'create', 'update', 'delete', 'compose', 'export',
  'upload', 'send', 'publish', 'schedule', 'approve', 'reject',
  'analyze', 'review', 'notify', 'sync',
];

const INTERACTION_OPTIONS: { id: string; label: string; why: string }[] = [
  { id: 'none', label: 'None', why: 'Nova runs with no human involvement.' },
  { id: 'approve_before_executing', label: 'Approve before', why: 'User approves, then Nova acts.' },
  { id: 'review_before_next', label: 'Review after', why: 'Nova acts, user reviews before next step.' },
  { id: 'human_only', label: 'Human only', why: 'User performs this step; Nova just logs.' },
  { id: 'notify_after', label: 'Notify after', why: 'Nova acts; user is notified.' },
];

const EXECUTION_OPTIONS: { id: string; label: string }[] = [
  { id: 'auto_immediate', label: 'Auto · immediate' },
  { id: 'auto_on_approval', label: 'Auto · on approval' },
  { id: 'auto_on_schedule', label: 'Auto · scheduled' },
  { id: 'async', label: 'Async · queued' },
  { id: 'manual', label: 'Manual trigger' },
];

// ─── Props ────────────────────────────────────────────────────────

export type RichNodeData = {
  id: string;
  label: string;
  description?: string;
  location?: string;
  action?: string;
  interaction?: string;
  execution?: string;
  prompt?: string;
  integrationProvider?: string;
  approvalRequired?: boolean;
};

type Props = {
  workflowId: string;
  node: RichNodeData | null;
  onChange: (patch: Partial<RichNodeData>) => void;
  onClose: () => void;
  onDelete?: () => void;
};

// ─── Component ────────────────────────────────────────────────────

export default function NodeInspector({ workflowId, node, onChange, onClose, onDelete }: Props) {
  const [draft, setDraft] = useState<RichNodeData | null>(node);
  const originalRef = useRef<RichNodeData | null>(node);

  useEffect(() => {
    setDraft(node);
    originalRef.current = node;
  }, [node]);

  useEffect(() => {
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [node, onClose]);

  if (!node || !draft) return null;

  function update<K extends keyof RichNodeData>(key: K, value: RichNodeData[K]) {
    const next = { ...draft!, [key]: value };
    setDraft(next);
    onChange({ [key]: value } as Partial<RichNodeData>);
  }

  async function recordLearning() {
    const before = originalRef.current;
    const after = draft;
    if (!before || !after) return;
    // Only log if something meaningful changed.
    const meaningful =
      before.label !== after.label ||
      before.description !== after.description ||
      before.location !== after.location ||
      before.action !== after.action ||
      before.interaction !== after.interaction ||
      before.prompt !== after.prompt;
    if (!meaningful) return;
    try {
      await fetch('/api/workflows/node-learned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          nodeLabel: after.label,
          action: 'edit',
          before: JSON.stringify({
            label: before.label,
            description: before.description,
            location: before.location,
            action: before.action,
            interaction: before.interaction,
            execution: before.execution,
          }),
          after: JSON.stringify({
            label: after.label,
            description: after.description,
            location: after.location,
            action: after.action,
            interaction: after.interaction,
            execution: after.execution,
          }),
        }),
      });
    } catch {
      /* best-effort; the graph change already persists via onSave */
    }
  }

  return (
    <>
      <div
        onClick={() => { void recordLearning(); onClose(); }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Edit step: ${draft.label}`}
        className="fixed top-0 right-0 h-screen w-[400px] max-w-[92vw] z-50 flex flex-col"
        style={{
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] tracking-[0.18em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
            Step detail
          </p>
          <button
            onClick={() => { void recordLearning(); onClose(); }}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          <Field label="Title">
            <input
              value={draft.label}
              onChange={e => update('label', e.target.value)}
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Description · what happens here">
            <textarea
              value={draft.description ?? ''}
              onChange={e => update('description', e.target.value)}
              placeholder="One sentence: what does this step do, in plain English?"
              rows={3}
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <Field label="Integration / Location">
            <select
              value={draft.location ?? ''}
              onChange={e => {
                update('location', e.target.value);
                update('integrationProvider', e.target.value);
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— pick a location —</option>
              {LOCATION_OPTIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Action">
            <select
              value={draft.action ?? ''}
              onChange={e => update('action', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— pick an action —</option>
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>

          <Field label="Human interaction">
            <div className="space-y-1.5">
              {INTERACTION_OPTIONS.map(opt => {
                const active = draft.interaction === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      update('interaction', opt.id);
                      if (opt.id === 'approve_before_executing') {
                        update('approvalRequired', true);
                        update('execution', 'auto_on_approval');
                      } else {
                        update('approvalRequired', false);
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg"
                    style={{
                      background: active ? 'rgba(200,242,107,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(200,242,107,0.22)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: active ? '#C8F26B' : 'transparent',
                          border: `1px solid ${active ? '#C8F26B' : 'rgba(255,255,255,0.15)'}`,
                        }}
                      >
                        {active && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />
                        )}
                      </span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>{opt.label}</span>
                    </div>
                    <p className="text-[11px] font-light leading-snug pl-5" style={{ color: 'var(--text-3)' }}>
                      {opt.why}
                    </p>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Execution">
            <select
              value={draft.execution ?? ''}
              onChange={e => update('execution', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— inherit from interaction —</option>
              {EXECUTION_OPTIONS.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Nova prompt · instructions for this step">
            <textarea
              value={draft.prompt ?? ''}
              onChange={e => update('prompt', e.target.value)}
              placeholder='e.g. "Read the most recent brief from /Projects. Summarize the brand voice in 3 bullet points. Never send anything out — this is input for the next step."'
              rows={4}
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          {onDelete && (
            <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => {
                  if (!window.confirm(`Delete step "${draft.label}"?`)) return;
                  onDelete();
                }}
                className="text-xs font-light px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,107,107,0.08)',
                  border: '1px solid rgba(255,107,107,0.22)',
                  color: '#FF8C8C',
                }}
              >
                Delete this step
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] font-light leading-snug" style={{ color: 'var(--text-3)' }}>
            Edits save locally as you type. Every change is also written to Nova's memory so future planner calls inherit the pattern.
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── helpers ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-1)',
  fontWeight: 300,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.16em] uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
