'use client';

/**
 * PresenceStack — avatar cluster showing who is currently online,
 * optionally filtered to a specific Environment. Consumes the
 * existing /api/presence route (SSE-backed global presence), and
 * when an environmentId is supplied filters the roster client-side
 * against the env's membership list.
 *
 * Hover reveals a full list with the page each teammate is on.
 * Deliberately ambient — presence is a subtle signal, not a
 * notification.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  avatar: string | null;
  currentPage: string | null;
  connectedAt: string;
};

type Props = {
  /** Optional — when provided, filter to members of this Environment. */
  environmentId?: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PresenceStack({ environmentId }: Props) {
  const pathname = usePathname();
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string> | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Load env-scoped member ids if requested.
  useEffect(() => {
    if (!environmentId) {
      setMemberIds(null);
      return;
    }
    fetch(`/api/environments/${environmentId}/members`)
      .then(r => r.json())
      .then(data => {
        const ids = new Set<string>();
        if (data.owner?.id) ids.add(data.owner.id);
        if (Array.isArray(data.members)) {
          for (const m of data.members) if (m.id) ids.add(m.id);
        }
        setMemberIds(ids);
      })
      .catch(() => setMemberIds(new Set()));
  }, [environmentId]);

  // Identify "me" so the stack highlights the caller.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.user?.id && setMeId(d.user.id))
      .catch(() => {});
  }, []);

  const heartbeat = useCallback(async () => {
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pathname ?? '/' }),
      });
      const res = await fetch('/api/presence');
      if (!res.ok) return;
      const data = await res.json();
      setOnline(Array.isArray(data.users) ? data.users : []);
    } catch {
      /* silent — presence is non-critical */
    }
  }, [pathname]);

  useEffect(() => {
    heartbeat();
    const id = setInterval(heartbeat, 30_000);
    const onVis = () => { if (!document.hidden) heartbeat(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [heartbeat]);

  // Filter to env members when an env is scoped.
  const roster = memberIds ? online.filter(u => memberIds.has(u.id)) : online;

  // Put "me" at the end so it renders on the right edge of the stack.
  const others = roster.filter(u => u.id !== meId);
  const me = roster.find(u => u.id === meId);
  const ordered = me ? [...others, me] : others;
  const visible = ordered.slice(0, 4);
  const overflow = ordered.length - visible.length;

  if (ordered.length === 0) return null;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center">
        {visible.map((p, i) => {
          const isMe = p.id === meId;
          return (
            <span
              key={p.id}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-light"
              title={`${p.name}${isMe ? ' (you)' : ''}`}
              style={{
                background: isMe ? 'rgba(191,159,241,0.15)' : 'rgba(200,242,107,0.12)',
                color: isMe ? '#BF9FF1' : '#C8F26B',
                border: `1px solid ${isMe ? 'rgba(191,159,241,0.3)' : 'rgba(200,242,107,0.2)'}`,
                marginLeft: i === 0 ? 0 : -6,
                boxShadow: '0 0 0 2px rgba(12,12,18,0.95)',
                zIndex: visible.length - i,
              }}
            >
              {p.initials || initials(p.name)}
            </span>
          );
        })}
        {overflow > 0 && (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-light"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-3)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginLeft: -6,
              boxShadow: '0 0 0 2px rgba(12,12,18,0.95)',
            }}
          >
            +{overflow}
          </span>
        )}
      </div>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(12,12,18,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          <p
            className="text-[10px] tracking-[0.16em] uppercase font-light px-4 py-2.5"
            style={{
              color: 'var(--text-3)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            {ordered.length} online
          </p>
          <div className="py-1 max-h-64 overflow-y-auto">
            {ordered.map(p => {
              const isMe = p.id === meId;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-1.5">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-light flex-shrink-0"
                    style={{
                      background: isMe ? 'rgba(191,159,241,0.15)' : 'rgba(200,242,107,0.12)',
                      color: isMe ? '#BF9FF1' : '#C8F26B',
                      border: `1px solid ${isMe ? 'rgba(191,159,241,0.3)' : 'rgba(200,242,107,0.2)'}`,
                    }}
                  >
                    {p.initials || initials(p.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-light truncate" style={{ color: 'var(--text-1)' }}>
                      {p.name}
                      {isMe && (
                        <span
                          className="ml-1 text-[10px]"
                          style={{ color: 'var(--text-3)' }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    {p.currentPage && (
                      <p
                        className="text-[10px] font-light truncate"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {p.currentPage}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
