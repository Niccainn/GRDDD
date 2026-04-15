/**
 * Shared chrome for every auth page (sign-in, sign-up, forgot-password,
 * reset-password, verify-email, welcome). Keeps the visual language
 * identical across the whole auth funnel so users feel like they're
 * moving inside one continuous surface rather than between screens.
 *
 * Single-column, center-stage, ambient background — calm rhythm over
 * marketing-site multi-pane layouts. The brand mark sits above the
 * glass panel so the mark is always in the same spot regardless of
 * panel height.
 */
import type { ReactNode } from 'react';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 ambient-bg">
      <div className="w-full max-w-[420px]">
        {/* Brand mark — subtle, consistent anchor across every auth screen */}
        <div className="flex justify-center mb-9">
          <svg
            width="34"
            height="44"
            viewBox="0 0 79 100"
            fill="none"
            aria-label="GRID"
            style={{ opacity: 0.22 }}
          >
            <rect x="2" y="2" width="75" height="96" rx="10" stroke="white" strokeWidth="2" />
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2" />
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        <div className="glass-panel p-8 sm:p-10">
          <h1
            className="text-[22px] leading-tight font-light text-center tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-[13px] text-center mt-2 mb-7 font-light"
              style={{ color: 'var(--text-3)' }}
            >
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-7" />}

          {children}
        </div>

        {footer && (
          <p
            className="text-xs text-center mt-6 font-light"
            style={{ color: 'var(--text-3)' }}
          >
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
