/**
 * "Continue with Microsoft" button. Renders only when the MICROSOFT
 * OAuth env vars are present. Shares the same style + availability-
 * check pattern as GoogleButton.
 *
 * Pairs with GoogleButton on /sign-in and /sign-up. When both are
 * enabled, Google renders first (statistically the higher conversion
 * path) and Microsoft second. Either alone still shows the divider
 * below.
 */
'use client';

import { useState, useEffect } from 'react';

export default function MicrosoftButton({
  label = 'Continue with Microsoft',
  next,
  /** When true, render without the trailing "or" divider so
   * it can sit between two existing elements. */
  inline = false,
}: {
  label?: string;
  next?: string;
  inline?: boolean;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then(data => setAvailable(Array.isArray(data.oauth) && data.oauth.includes('microsoft')))
      .catch(() => setAvailable(false));
  }, []);

  if (available === false) return null;
  if (available === null) return <div className="h-[50px]" />;

  const href = `/api/auth/oauth/microsoft/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <>
      <a
        href={href}
        className="group w-full flex items-center justify-center gap-3 py-[13px] rounded-full text-sm font-light transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'var(--text-1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        }}
      >
        {/* Microsoft four-square mark. */}
        <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
          <rect x="1" y="1" width="10" height="10" fill="#F25022" />
          <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
          <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
          <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
        </svg>
        <span>{label}</span>
      </a>
      {!inline && (
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-light"
            style={{ color: 'var(--text-3)' }}
          >
            or
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}
    </>
  );
}
