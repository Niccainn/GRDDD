'use client';

/**
 * ActivitySheet — right-side slide-in drawer that shows the full
 * audit trail for any object in the product. Reads
 * /api/audit/entity?type=...&id=... and renders a timeline of
 * actor + action + diff.
 *
 * Works for: Workflow, System, Goal, Signal, Execution, Project,
 * anything written to AuditLog with a stable (entity, entityId).
 *
 * The opener (parent page) passes { entityType, entityId } to
 * mount. `null` entityId closes the drawer.
 */

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  createdAt: string;
  action: string;
  actor: { id: string | null; name: string | null; type: string | null };
  entity: { type: string; id: string | null; name: string | null };
  hasBefore: boolean;
  hasAfter: boolean;
  hasMetadata: boolean;
  before: string | null;
  after: string | null;
  metadata: string | null;
};

type Props = {
  entityType: string | null;
  entityId: string | null;
  entityLabel?: string;
  onClose: () => void;
};

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function actionTone(action: string): string {
  if (action.startsWith('undo.')) return '#FF8C8C';
  if (action.includes('deleted') || action.includes('removed') || action.includes('failed')) return '#FF6B6B';
  if (action.includes('completed') || action.includes('approved') || action.includes('connected')) return '#C8F26B';
  if (action.includes('updated') || action.includes('changed')) return '#F5D76E';
  if (action.includes('created') || action.includes('added')) return '#7193ED';
  return '#BF9FF1';
}

export default function ActivitySheet({ entityType, entityId, entityLabel, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!entityType || !entityId) { setRows([]); return; }
    setLoading(true);
    fetch(`/api/audit/entity?type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(entityId)}&limit=100`)
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d.rows) ? d.rows : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    if (!entityId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entityId, onClose]);

  if (!entityId) return null;

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        aria-label="Activity"
        className="fixed top-0 right-0 h-screen w-screen md:w-[420px] md:max-w-[92vw] z-50 flex flex-col"
        style={{
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div>
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Activity
            </p>
            {entityLabel && (
              <p className="text-sm font-light mt-0.5" style={{ color: 'var(--text-1)' }}>
                {entityLabel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
                No recorded activity yet
              </p>
              <p className="text-xs font-light max-w-sm mx-auto" style={{ color: 'var(--text-3)' }}>
                Every mutation on this object writes an audit row. Nothing has changed
                since it was created.
              </p>
            </div>
          ) : (
            <ol className="relative px-6 py-5">
              {/* spine */}
              <span
                aria-hidden
                className="absolute"
                style={{
                  left: 30,
                  top: 28,
                  bottom: 28,
                  width: 1,
                  background: 'var(--glass-border)',
                }}
              />
              {rows.map(r => {
                const tone = actionTone(r.action);
                const isExpanded = expanded.has(r.id);
                const canExpand = r.hasBefore || r.hasAfter || r.hasMetadata;
                return (
                  <li key={r.id} className="relative pl-8 pb-5 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: `${tone}14`,
                        border: `1px solid ${tone}40`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
                    </span>
                    <div className="flex items-start gap-2 flex-wrap">
                      <p
                        className="text-xs font-light"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {r.action.replace(/\./g, ' · ')}
                      </p>
                      {r.actor?.name && (
                        <span
                          className="text-[11px] font-light"
                          style={{ color: 'var(--text-3)' }}
                        >
                          by {r.actor.name}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[11px] font-light mt-0.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {relativeTime(r.createdAt)} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="text-[11px] font-light mt-1.5"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {isExpanded ? 'Hide diff' : 'Show diff'}
                      </button>
                    )}
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {r.before && (
                          <Diff label="Before" body={r.before} />
                        )}
                        {r.after && (
                          <Diff label="After" body={r.after} />
                        )}
                        {r.metadata && !r.before && !r.after && (
                          <Diff label="Metadata" body={r.metadata} />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <footer
          className="px-6 py-3 text-[11px] font-light flex-shrink-0"
          style={{
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-3)',
          }}
        >
          Reads from AuditLog · Export CSV at /api/audit/export
        </footer>
      </aside>
    </>
  );
}

function Diff({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p
        className="text-[10px] tracking-[0.16em] uppercase font-light mb-1"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      <pre
        className="text-[11px] font-light leading-relaxed p-2 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-2)',
          whiteSpace: 'pre-wrap',
          maxHeight: 220,
          overflow: 'auto',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        {body}
      </pre>
    </div>
  );
}
