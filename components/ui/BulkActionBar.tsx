'use client';

/**
 * BulkActionBar — floating bottom bar that appears when one or more
 * items are multi-selected. Matches the Asana / Monday / Linear
 * pattern: fixed to the bottom center of the viewport, shows the
 * selection count on the left and a row of action buttons on the
 * right, closes via Esc or a × button.
 *
 * Parent pages own the selection state (a Set<string>) and pass in
 * the action handlers. This component is rendering only — no
 * selection logic lives here, so it drops cleanly onto any list.
 */

import { useEffect } from 'react';

type Action = {
  label: string;
  onAction: () => void;
  tone?: 'default' | 'danger' | 'primary';
  kbd?: string;
  disabled?: boolean;
};

type Props = {
  count: number;
  itemLabel?: string; // "task" | "goal" | "document" — pluralized automatically
  actions: Action[];
  onClear: () => void;
};

export default function BulkActionBar({ count, itemLabel = 'item', actions, onClear }: Props) {
  useEffect(() => {
    if (count === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClear]);

  if (count === 0) return null;

  const label = count === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[75] rounded-full"
      style={{
        background: 'rgba(12,12,18,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        padding: '6px 8px 6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 300,
          color: 'var(--text-1)',
          paddingRight: 4,
        }}
      >
        <strong style={{ fontWeight: 400, color: 'var(--brand)' }}>{count}</strong>{' '}
        {label} selected
      </span>
      <span style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />
      <div className="flex items-center gap-1">
        {actions.map(action => {
          const toneColor =
            action.tone === 'danger'
              ? '#E04E4E'
              : action.tone === 'primary'
              ? '#C8F26B'
              : 'var(--text-2)';
          const toneBg =
            action.tone === 'danger'
              ? 'rgba(224,78,78,0.08)'
              : action.tone === 'primary'
              ? 'rgba(200,242,107,0.08)'
              : 'transparent';
          const toneBorder =
            action.tone === 'danger'
              ? '1px solid rgba(224,78,78,0.18)'
              : action.tone === 'primary'
              ? '1px solid rgba(200,242,107,0.2)'
              : '1px solid transparent';
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (!action.disabled) action.onAction();
              }}
              disabled={action.disabled}
              className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
              style={{ color: toneColor, background: toneBg, border: toneBorder }}
            >
              {action.label}
              {action.kbd && (
                <kbd
                  style={{
                    padding: '1px 5px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: 10,
                    color: 'var(--text-3)',
                  }}
                >
                  {action.kbd}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection (Esc)"
        className="w-6 h-6 rounded-full flex items-center justify-center ml-1"
        style={{
          color: 'var(--text-3)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
