'use client';

/**
 * DataOriginTag — the tiny hover tag every widget wears so users
 * (and procurement reviewers) can see where the numbers on the page
 * came from.
 *
 * Shows as a subtle dot in the corner. On hover/focus a tooltip
 * expands with "Reads from: <sources>. Computed: <how>."
 *
 * Boring until you're in an enterprise security review, then the
 * thing that closes the deal.
 */

import { useState } from 'react';

type Props = {
  sources: string[];
  computed: string;
  className?: string;
};

export default function DataOriginTag({ sources, computed, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={className ?? 'inline-flex items-center'}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        aria-label="Data origin"
        tabIndex={0}
        className="flex items-center justify-center w-4 h-4 rounded-full transition-colors"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-3)',
          fontSize: 9,
          fontWeight: 300,
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 text-[11px] font-light"
          style={{
            right: 0,
            top: 22,
            width: 240,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(12,12,18,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            color: 'var(--text-2)',
            lineHeight: 1.5,
            backdropFilter: 'blur(20px)',
          }}
        >
          <span className="block mb-1" style={{ color: 'var(--text-3)' }}>Reads from</span>
          <span className="block mb-2" style={{ color: 'var(--text-1)' }}>
            {sources.join(', ')}
          </span>
          <span className="block mb-1" style={{ color: 'var(--text-3)' }}>Computed</span>
          <span className="block" style={{ color: 'var(--text-1)' }}>{computed}</span>
        </span>
      )}
    </span>
  );
}
