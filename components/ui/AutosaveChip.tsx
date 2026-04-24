'use client';

/**
 * AutosaveChip — a small status chip that reads "Saving…" → "Saved · just now"
 * and fades to a subtle dot after a few seconds. Drop one in anywhere a
 * controlled input / form auto-persists.
 *
 * Props:
 *   - state: 'idle' | 'saving' | 'saved' | 'error'
 *   - lastSavedAt?: ISO date string — drives the relative-time label
 *   - message?: string — override ("Saved", "Synced to Notion", etc.)
 *
 * Intentionally stateless — the parent owns the transitions. The chip
 * only handles the visual fade after `saved` is set.
 */

import { useEffect, useState } from 'react';

type Props = {
  state: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string | null;
  message?: string;
  /** Force-compact variant (12px text, pill only). */
  compact?: boolean;
};

function relative(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 5_000) return 'just now';
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return `${Math.floor(d / 3_600_000)}h ago`;
}

export default function AutosaveChip({ state, lastSavedAt, message, compact }: Props) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (state !== 'saved') {
      setMuted(false);
      return;
    }
    const t = setTimeout(() => setMuted(true), 2500);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'idle') return null;

  const size = compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';

  if (state === 'saving') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-light transition-colors ${size}`}
        style={{
          background: 'rgba(191,159,241,0.06)',
          border: '1px solid rgba(191,159,241,0.15)',
          color: '#BF9FF1',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: '#BF9FF1' }}
        />
        Saving…
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-light ${size}`}
        style={{
          background: 'rgba(255,107,107,0.06)',
          border: '1px solid rgba(255,107,107,0.18)',
          color: '#FF8C8C',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C8C' }} />
        {message ?? 'Not saved'}
      </span>
    );
  }

  // saved
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-light transition-opacity duration-500 ${size}`}
      style={{
        background: muted ? 'transparent' : 'rgba(200,242,107,0.06)',
        border: `1px solid ${muted ? 'rgba(255,255,255,0.04)' : 'rgba(200,242,107,0.18)'}`,
        color: muted ? 'var(--text-3)' : '#C8F26B',
        opacity: muted ? 0.5 : 1,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: muted ? 'var(--text-3)' : '#C8F26B' }}
      />
      {message ?? 'Saved'}
      {!muted && lastSavedAt && (
        <span style={{ color: 'var(--text-3)' }}> · {relative(lastSavedAt)}</span>
      )}
    </span>
  );
}
