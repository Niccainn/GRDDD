'use client';

/**
 * WhyDrawer — the "why did Nova do this?" surface. Opens from the
 * action ledger (or anywhere an action id is referenced). Read-only.
 *
 * The trust layer is built on this: every autonomous action is
 * explainable inline, within one click of where it happened.
 */

import { useEffect, useState } from 'react';

type NovaAction = {
  id: string;
  source: 'nova';
  action: string;
  createdAt: string;
  system?: { id: string; name: string; color: string | null } | null;
  input: string | null;
  output: string | null;
  reasoning: string;
  tokens: number | null;
  cost: number | null;
  success: boolean;
  error: string | null;
};

type AuditAction = {
  id: string;
  source: 'audit';
  action: string;
  createdAt: string;
  entity: { type: string; id: string | null; name: string | null };
  actor: { id: string | null; name: string | null; type: string | null };
  before: string | null;
  after: string | null;
  metadata: string | null;
};

type ActionData = NovaAction | AuditAction;

export default function WhyDrawer({
  actionId,
  environmentId,
  onClose,
  onUndone,
}: {
  actionId: string | null;
  environmentId?: string;
  onClose: () => void;
  onUndone?: (actionId: string) => void;
}) {
  const [data, setData] = useState<ActionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [teachReason, setTeachReason] = useState<string | null>(null);
  const [teachNote, setTeachNote] = useState('');
  const [teachState, setTeachState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [undoState, setUndoState] = useState<'idle' | 'pending' | 'done' | 'expired' | 'error'>('idle');

  useEffect(() => {
    if (!actionId) {
      setData(null);
      setTeachReason(null);
      setTeachNote('');
      setTeachState('idle');
      setUndoState('idle');
      return;
    }
    setLoading(true);
    fetch(`/api/nova/action/${encodeURIComponent(actionId)}`)
      .then(r => r.json())
      .then(d => {
        setData(d?.error ? null : d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actionId]);

  async function undo() {
    if (!actionId || !environmentId) return;
    setUndoState('pending');
    try {
      const res = await fetch(
        `/api/environments/${environmentId}/actions/${encodeURIComponent(actionId)}/undo`,
        { method: 'POST' },
      );
      if (res.status === 410) { setUndoState('expired'); return; }
      if (!res.ok) { setUndoState('error'); return; }
      setUndoState('done');
      onUndone?.(actionId);
    } catch {
      setUndoState('error');
    }
  }

  async function teach() {
    if (!actionId || !teachReason) return;
    setTeachState('saving');
    try {
      const res = await fetch(
        `/api/nova/action/${encodeURIComponent(actionId)}/teach`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: teachReason, note: teachNote }),
        },
      );
      if (res.ok) {
        setTeachState('saved');
      } else {
        setTeachState('idle');
      }
    } catch {
      setTeachState('idle');
    }
  }

  useEffect(() => {
    if (!actionId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actionId, onClose]);

  if (!actionId) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Why Nova did this"
        className="fixed top-0 right-0 h-screen w-[420px] max-w-[92vw] z-50 flex flex-col"
        style={{
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <p className="text-[10px] tracking-[0.18em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
            Why this happened
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : !data ? (
            <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
              The trace for this action is no longer available.
            </p>
          ) : data.source === 'nova' ? (
            <>
              <NovaTrace data={data} />
              {environmentId && (
                <div className="mt-8 space-y-5">
                  <TeachSection
                    reason={teachReason}
                    note={teachNote}
                    state={teachState}
                    onReason={setTeachReason}
                    onNote={setTeachNote}
                    onSave={teach}
                  />
                  <UndoSection
                    createdAt={data.createdAt}
                    state={undoState}
                    onUndo={undo}
                  />
                </div>
              )}
            </>
          ) : (
            <AuditTrace data={data} />
          )}
        </div>
      </aside>
    </>
  );
}

function TeachSection({
  reason,
  note,
  state,
  onReason,
  onNote,
  onSave,
}: {
  reason: string | null;
  note: string;
  state: 'idle' | 'saving' | 'saved';
  onReason: (r: string) => void;
  onNote: (n: string) => void;
  onSave: () => void;
}) {
  const reasons: { id: string; label: string }[] = [
    { id: 'wrong_data', label: 'Wrong data' },
    { id: 'wrong_judgment', label: 'Wrong judgment' },
    { id: 'wrong_timing', label: 'Wrong timing' },
    { id: 'other', label: 'Other' },
  ];
  if (state === 'saved') {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(200,242,107,0.06)', border: '1px solid rgba(200,242,107,0.2)' }}
      >
        <p className="text-xs font-light" style={{ color: '#C8F26B' }}>
          Nova recorded the correction. Future calls will factor this in.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Teach Nova why this was off
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {reasons.map(r => {
          const active = reason === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onReason(r.id)}
              className="text-[11px] font-light px-3 py-1.5 rounded-full"
              style={{
                background: active ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#FF8C8C' : 'var(--text-2)',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={e => onNote(e.target.value)}
        placeholder="One line: what would the right call have been?"
        rows={2}
        className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none mb-2"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-1)',
          resize: 'vertical',
        }}
      />
      <button
        onClick={onSave}
        disabled={!reason || state === 'saving'}
        className="text-[11px] font-light px-4 py-1.5 rounded-full disabled:opacity-40"
        style={{
          background: 'var(--brand-soft)',
          border: '1px solid var(--brand-border)',
          color: 'var(--brand)',
        }}
      >
        {state === 'saving' ? 'Recording…' : 'Teach Nova →'}
      </button>
    </div>
  );
}

function UndoSection({
  createdAt,
  state,
  onUndo,
}: {
  createdAt: string;
  state: 'idle' | 'pending' | 'done' | 'expired' | 'error';
  onUndo: () => void;
}) {
  const age = Date.now() - new Date(createdAt).getTime();
  const remainingMs = 24 * 60 * 60 * 1000 - age;
  const withinWindow = remainingMs > 0;
  const hoursLeft = Math.max(0, Math.round(remainingMs / 3_600_000));

  if (state === 'done') {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(200,242,107,0.06)', border: '1px solid rgba(200,242,107,0.2)' }}
      >
        <p className="text-xs font-light" style={{ color: '#C8F26B' }}>
          Undone. The action is marked reversed and Nova has been told not to repeat it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Reversible window
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          disabled={!withinWindow || state === 'pending'}
          className="text-xs font-light px-4 py-1.5 rounded-full disabled:opacity-40"
          style={{
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.25)',
            color: '#FF8C8C',
          }}
        >
          {state === 'pending' ? 'Undoing…' : 'Undo this action'}
        </button>
        <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
          {withinWindow ? `${hoursLeft}h left in the window` : 'Window expired'}
        </span>
      </div>
      {state === 'expired' && (
        <p className="text-[11px] font-light mt-2" style={{ color: '#FF8C8C' }}>
          The 24-hour undo window has passed.
        </p>
      )}
      {state === 'error' && (
        <p className="text-[11px] font-light mt-2" style={{ color: '#FF8C8C' }}>
          Could not record the undo. Try again in a moment.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p
        className="text-[10px] tracking-[0.16em] uppercase font-light mb-1.5"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="text-[11px] font-light whitespace-pre-wrap leading-relaxed p-3 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--text-2)',
        maxHeight: 260,
        overflow: 'auto',
      }}
    >
      {children}
    </pre>
  );
}

function NovaTrace({ data }: { data: NovaAction }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-light tracking-[0.16em] uppercase px-2 py-0.5 rounded-full"
          style={{ color: '#BF9FF1', background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.25)' }}
        >
          Nova
        </span>
        {data.system && (
          <span className="flex items-center gap-1.5 text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
            {data.system.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: data.system.color }} />}
            {data.system.name}
          </span>
        )}
        {!data.success && (
          <span
            className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{ color: '#FF6B6B', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)' }}
          >
            Failed
          </span>
        )}
      </div>
      <h2 className="text-base font-light mb-5" style={{ color: 'var(--text-1)' }}>
        {data.action}
      </h2>
      <Field label="Reasoning">
        <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {data.reasoning}
        </p>
      </Field>
      {data.input && (
        <Field label="What Nova read">
          <Mono>{data.input}</Mono>
        </Field>
      )}
      {data.output && (
        <Field label="What Nova produced">
          <Mono>{data.output}</Mono>
        </Field>
      )}
      {data.error && (
        <Field label="Error">
          <Mono>{data.error}</Mono>
        </Field>
      )}
      <div className="flex items-center gap-4 mt-6 text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
        <span>{new Date(data.createdAt).toLocaleString()}</span>
        {data.tokens != null && <span>{data.tokens.toLocaleString()} tokens</span>}
        {data.cost != null && <span>${data.cost.toFixed(4)}</span>}
      </div>
    </>
  );
}

function AuditTrace({ data }: { data: AuditAction }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-light tracking-[0.16em] uppercase px-2 py-0.5 rounded-full"
          style={{ color: '#8B9AA8', background: 'rgba(139,154,168,0.1)', border: '1px solid rgba(139,154,168,0.25)' }}
        >
          Audit
        </span>
        {data.actor.name && (
          <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
            by {data.actor.name}
          </span>
        )}
      </div>
      <h2 className="text-base font-light mb-5" style={{ color: 'var(--text-1)' }}>
        {data.action}
      </h2>
      {data.entity.name && (
        <Field label="Entity">
          <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
            {data.entity.type} · {data.entity.name}
          </p>
        </Field>
      )}
      {data.before && (
        <Field label="Before">
          <Mono>{data.before}</Mono>
        </Field>
      )}
      {data.after && (
        <Field label="After">
          <Mono>{data.after}</Mono>
        </Field>
      )}
      {data.metadata && (
        <Field label="Metadata">
          <Mono>{data.metadata}</Mono>
        </Field>
      )}
      <p className="text-[11px] font-light mt-6" style={{ color: 'var(--text-3)' }}>
        {new Date(data.createdAt).toLocaleString()}
      </p>
    </>
  );
}
