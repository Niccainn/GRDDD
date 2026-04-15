'use client';
/**
 * ConsentBanner — combined cookie consent + AI disclosure
 *
 * One banner, two jobs:
 *   1. GDPR/ePrivacy cookie consent — the user can Accept or Decline
 *      non-essential cookies. Strictly-necessary cookies (session,
 *      OAuth state) are set regardless; only analytics would be gated.
 *   2. EU AI Act transparency — a plain-language notice that GRID uses
 *      AI (Nova) and outputs may be inaccurate. This is required once,
 *      visible, and cannot be hidden without acknowledgement.
 *
 * Persistence: we store the choice in localStorage AND set a
 * `grid_consent` cookie so server-side code (analytics, etc.) can gate
 * on it without reading the client store. The cookie is set via
 * document.cookie to stay transparent — no third-party consent SDK.
 *
 * The banner never blocks the page; it sits at the bottom, anchored,
 * dismissible, and the "Accept all" / "Essential only" buttons are
 * given equal visual weight per ePrivacy guidance (no dark patterns).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'grid_consent';
const COOKIE_NAME = 'grid_consent';

type ConsentChoice = 'all' | 'essential';

function readStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'all' || v === 'essential') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function persistConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
  // 6 months
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${COOKIE_NAME}=${choice}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readStoredConsent() === null) setVisible(true);
  }, []);

  function choose(choice: ConsentChoice) {
    persistConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent and AI transparency notice"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
    >
      <div
        className="glass-panel p-5"
        style={{
          background: 'var(--surface-1, rgba(10, 12, 20, 0.92))',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <p
          className="text-[11px] uppercase tracking-widest mb-2 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Privacy &amp; AI transparency
        </p>

        <p
          className="text-xs font-light leading-relaxed mb-4"
          style={{ color: 'var(--text-2)' }}
        >
          GRID uses strictly-necessary cookies to keep you signed in. Optional
          cookies help us improve the product — you can decline them. Nova is an
          AI system; its outputs may be inaccurate and should not be used for
          medical, legal, or financial decisions. See our{' '}
          <Link href="/privacy" style={{ color: 'var(--brand)' }}>
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" style={{ color: 'var(--brand)' }}>
            Terms
          </Link>
          .
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => choose('essential')}
            className="flex-1 py-2 text-xs font-light rounded-full"
            style={{
              background: 'var(--glass-1, rgba(255,255,255,0.04))',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
              color: 'var(--text-1)',
            }}
          >
            Essential only
          </button>
          <button
            onClick={() => choose('all')}
            className="flex-1 py-2 text-xs font-light rounded-full"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
