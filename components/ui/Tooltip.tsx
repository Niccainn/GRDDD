'use client';

/**
 * Tooltip — minimal, CSS-only hover tooltip with optional keyboard-
 * shortcut hint. Appears above the wrapped trigger, 180ms delay.
 *
 * Usage:
 *   <Tooltip label="Rename" kbd="⌘R">
 *     <button>…</button>
 *   </Tooltip>
 *
 * Intentional choices:
 *   - No portal — stays inside the DOM subtree so it inherits the
 *     surrounding z-index stack. Avoids portal-related tab-focus bugs.
 *   - No JS state — pure CSS :hover + :focus-within, keeps re-renders
 *     out of the tooltip path.
 *   - Renders kbd as a `<kbd>` element so it picks up the default
 *     monospace + border styling from the global CSS.
 */

import React from 'react';

type Props = {
  label: string;
  kbd?: string;
  /** Position relative to trigger. Defaults to 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
};

const POS: Record<NonNullable<Props['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export default function Tooltip({ label, kbd, side = 'top', children }: Props) {
  return (
    <span className="relative inline-flex group focus-within:z-50">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${POS[side]} whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150`}
        style={{
          background: 'rgba(12,12,18,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 300,
          color: 'var(--text-1)',
          zIndex: 60,
        }}
      >
        {label}
        {kbd && (
          <kbd
            style={{
              marginLeft: 6,
              padding: '1px 5px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 3,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 10,
              color: 'var(--text-3)',
            }}
          >
            {kbd}
          </kbd>
        )}
      </span>
    </span>
  );
}
