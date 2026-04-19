'use client';

import { ReactNode } from 'react';

/**
 * A widget action is a decision the user can commit to WITHOUT
 * leaving the widget. Distinct from the header `action` prop, which
 * is the "see all" / navigation escape hatch. A widget may declare
 * 0–3 actions; each renders as a footer button.
 *
 * Design rationale (MDL Gap #3): every widget surfaces data (stage 2
 * — Orientation) but most don't close the loop into Commitment
 * (stage 4). Exposing action intents as first-class widget props
 * means every new widget gets the pattern for free, and the
 * decision → action latency drops from "read, navigate, click"
 * (≥3s) to a single click.
 */
export type WidgetAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  /** Visual emphasis. "primary" gets the brand-fill treatment. */
  intent?: 'primary' | 'secondary' | 'ghost';
  /** Optional disable reason — shown as tooltip when present. */
  disabledReason?: string;
};

type WidgetProps = {
  title: string;
  subtitle?: string;
  /** Top-right escape hatch (e.g., "See all"). */
  action?: { label: string; href?: string; onClick?: () => void };
  /** Footer action row — up to 3 one-click intents. */
  actions?: WidgetAction[];
  children: ReactNode;
  className?: string;
  span?: 1 | 2;
};

const INTENT_STYLES: Record<NonNullable<WidgetAction['intent']>, React.CSSProperties> = {
  primary: {
    background: 'var(--brand-soft)',
    border: '1px solid var(--brand-border)',
    color: 'var(--brand)',
  },
  secondary: {
    background: 'rgba(113,147,237,0.08)',
    border: '1px solid rgba(113,147,237,0.2)',
    color: '#7193ED',
  },
  ghost: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-2)',
  },
};

export default function Widget({
  title,
  subtitle,
  action,
  actions,
  children,
  className = '',
  span = 1,
}: WidgetProps) {
  return (
    <div
      className={`glass-deep p-3 md:p-5 flex flex-col animate-fade-in ${span === 2 ? 'md:col-span-2' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          action.href ? (
            <a href={action.href} className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              {action.label}
            </a>
          ) : (
            <button onClick={action.onClick} className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              {action.label}
            </button>
          )
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
      {/* Action footer — only renders if the widget declares any. */}
      {actions && actions.length > 0 && (
        <div
          className="flex flex-wrap gap-2 mt-4 pt-3"
          style={{ borderTop: '1px solid var(--glass-border)' }}
          role="group"
          aria-label={`${title} actions`}
        >
          {actions.slice(0, 3).map((a, i) => {
            const style = INTENT_STYLES[a.intent ?? 'ghost'];
            const disabled = Boolean(a.disabledReason);
            const commonProps = {
              title: a.disabledReason,
              'aria-disabled': disabled,
              className: `text-[11px] font-light px-3 py-1.5 rounded-full transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`,
              style,
            };
            if (a.href && !disabled) {
              return (
                <a key={i} href={a.href} {...commonProps}>
                  {a.label}
                </a>
              );
            }
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={a.onClick}
                {...commonProps}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
