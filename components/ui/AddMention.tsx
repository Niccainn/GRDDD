'use client';

/**
 * AddMention — the universal "add someone (human or Nova)" button.
 *
 * Opens a picker listing:
 *   - Nova (always first, purple accent)
 *   - Every member of the current Environment
 *
 * Used anywhere the product needs to attach an actor to an action,
 * workflow, step, environment membership, comment, etc. The parent
 * passes an `onPick` callback that receives `{ kind: 'human' | 'nova',
 * identityId?, name, role? }`.
 *
 * This is the single primitive behind every "assign," "invite,"
 * "@mention," and "ask" UX — so the interaction stays consistent.
 */

import { useEffect, useRef, useState } from 'react';

export type Pick = {
  kind: 'human' | 'nova';
  identityId?: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  membershipId: string | null;
};

type Props = {
  environmentId: string;
  /** Render as a button with this label. Defaults to "+ Add". */
  label?: string;
  /** If true, include Nova as a pickable entity. Default true. */
  allowNova?: boolean;
  /** If true, allow picking any number (usage: comment mentions). */
  multi?: boolean;
  /** Pre-selected identity ids to render as chips inline. */
  selected?: Pick[];
  onPick: (pick: Pick) => void;
  onRemove?: (pick: Pick) => void;
  /** Trigger variant — 'button' (default) or 'plain' (inline `@`). */
  variant?: 'button' | 'plain';
};

export default function AddMention({
  environmentId,
  label = '+ Add',
  allowNova = true,
  multi = false,
  selected = [],
  onPick,
  onRemove,
  variant = 'button',
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState<Member | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/environments/${environmentId}/members`)
      .then(r => r.json())
      .then(data => {
        if (data.owner) {
          setOwner({
            id: data.owner.id,
            name: data.owner.name,
            email: data.owner.email,
            role: 'OWNER',
            membershipId: null,
          });
        }
        if (Array.isArray(data.members)) setMembers(data.members);
      })
      .catch(() => {});
  }, [open, environmentId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const allMembers = [...(owner ? [owner] : []), ...members];
  const filtered = q
    ? allMembers.filter(m =>
        (m.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (m.email ?? '').toLowerCase().includes(q.toLowerCase()),
      )
    : allMembers;
  const matchesNova = allowNova && 'nova'.includes(q.toLowerCase());

  function handlePick(pick: Pick) {
    onPick(pick);
    if (!multi) setOpen(false);
    setQ('');
  }

  function initials(name: string | null) {
    return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <div ref={ref} className="relative inline-flex flex-wrap items-center gap-2">
      {/* Selected chips */}
      {selected.map(p => (
        <span
          key={(p.kind === 'nova' ? 'nova' : p.identityId) + ':' + p.name}
          className="inline-flex items-center gap-1.5 text-xs font-light pl-1.5 pr-2 py-1 rounded-full"
          style={{
            background:
              p.kind === 'nova' ? 'rgba(191,159,241,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${p.kind === 'nova' ? 'rgba(191,159,241,0.25)' : 'rgba(255,255,255,0.1)'}`,
            color: p.kind === 'nova' ? '#BF9FF1' : 'var(--text-2)',
          }}
        >
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-light"
            style={{
              background: p.kind === 'nova' ? 'rgba(191,159,241,0.18)' : 'rgba(200,242,107,0.12)',
              color: p.kind === 'nova' ? '#BF9FF1' : '#C8F26B',
              border: `1px solid ${p.kind === 'nova' ? 'rgba(191,159,241,0.3)' : 'rgba(200,242,107,0.2)'}`,
            }}
          >
            {p.kind === 'nova' ? 'N' : initials(p.name)}
          </span>
          {p.kind === 'nova' ? 'Nova' : p.name}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(p)}
              aria-label={`Remove ${p.name}`}
              className="ml-0.5 opacity-60 hover:opacity-100"
              style={{ color: 'inherit' }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </span>
      ))}

      {/* Trigger */}
      {variant === 'plain' ? (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center text-xs font-light transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          @
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-light px-3 py-1 rounded-full transition-colors"
          style={{
            background: open ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${open ? 'rgba(200,242,107,0.25)' : 'rgba(255,255,255,0.1)'}`,
            color: open ? '#C8F26B' : 'var(--text-2)',
          }}
        >
          {label}
        </button>
      )}

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-2 w-72 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(12,12,18,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          <input
            autoFocus
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search Nova or team…"
            className="w-full text-sm font-light px-4 py-3 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-1)',
            }}
          />
          <div className="max-h-64 overflow-y-auto py-1">
            {matchesNova && (
              <button
                type="button"
                onClick={() =>
                  handlePick({ kind: 'nova', name: 'Nova', role: 'agent' })
                }
                className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-light"
                  style={{
                    background: 'rgba(191,159,241,0.15)',
                    color: '#BF9FF1',
                    border: '1px solid rgba(191,159,241,0.3)',
                  }}
                >
                  N
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-light" style={{ color: 'var(--text-1)' }}>
                    Nova
                  </span>
                  <span className="block text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    Agent · runs with your permission
                  </span>
                </span>
              </button>
            )}
            {filtered.length === 0 && !matchesNova && (
              <p className="px-4 py-3 text-xs font-light" style={{ color: 'var(--text-3)' }}>
                No matches. Invite someone from /settings/team.
              </p>
            )}
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  handlePick({
                    kind: 'human',
                    identityId: m.id,
                    name: m.name ?? m.email ?? 'Teammate',
                    email: m.email,
                    role: m.role,
                  })
                }
                className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-light"
                  style={{
                    background: 'rgba(200,242,107,0.08)',
                    color: '#C8F26B',
                    border: '1px solid rgba(200,242,107,0.2)',
                  }}
                >
                  {initials(m.name)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                    {m.name ?? m.email}
                  </span>
                  <span className="block text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {m.role?.toLowerCase()} · {m.email ?? '—'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
