'use client';
/**
 * ConsentBanner — GDPR-compliant cookie consent with preferences panel
 *
 * Fixed bottom banner with glassmorphism styling. Users can Accept all
 * cookies or open Preferences to toggle analytics separately. Essential
 * cookies (session, OAuth state) are always on.
 *
 * Persistence: stores choice in a `grid_consent` cookie (1 year expiry)
 * via document.cookie. No third-party consent SDK.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

const COOKIE_NAME = 'grid_consent';

type ConsentChoice = 'accepted' | 'essential';

function readConsentCookie(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)')
  );
  return match ? match[1] : null;
}

function setConsentCookie(choice: ConsentChoice) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${COOKIE_NAME}=${choice}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    if (!readConsentCookie()) {
      // Small delay so the slide-up animation is visible
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    setConsentCookie('accepted');
    setVisible(false);
  }

  function savePrefs() {
    setConsentCookie(analyticsEnabled ? 'accepted' : 'essential');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
      style={{
        animation: 'consent-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <style>{`
        @keyframes consent-slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="p-5"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg, 24px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <p
          className="text-[11px] uppercase tracking-widest mb-2 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Cookie consent
        </p>

        <p
          className="text-xs font-light leading-relaxed mb-4"
          style={{ color: 'var(--text-2)' }}
        >
          We use essential cookies to run GRID. By continuing, you accept our{' '}
          <Link href="/privacy" style={{ color: 'var(--brand)' }}>
            Privacy Policy
          </Link>
          .
        </p>

        {/* Preferences panel */}
        {showPrefs && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Essential toggle - always on */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
                  Essential
                </p>
                <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                  Always on — required for GRID to work
                </p>
              </div>
              <button
                disabled
                aria-label="Essential cookies are always enabled"
                className="relative w-9 h-5 rounded-full cursor-not-allowed"
                style={{
                  background: 'var(--brand)',
                  opacity: 0.6,
                }}
              >
                <span
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full"
                  style={{ background: '#fff' }}
                />
              </button>
            </div>

            {/* Analytics toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
                  Analytics
                </p>
                <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                  Optional — helps us improve GRID
                </p>
              </div>
              <button
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                aria-label={`Analytics cookies ${analyticsEnabled ? 'enabled' : 'disabled'}`}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{
                  background: analyticsEnabled ? 'var(--brand)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{
                    background: '#fff',
                    left: analyticsEnabled ? 'calc(100% - 18px)' : '2px',
                  }}
                />
              </button>
            </div>

            <button
              onClick={savePrefs}
              className="w-full mt-3 py-2 text-xs font-light rounded-full"
              style={{
                background: 'var(--brand)',
                // Same contrast fix as the Accept button above —
                // black on aurora-lime is the established pattern.
                color: '#000',
                fontWeight: 400,
              }}
            >
              Save preferences
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className="flex-1 py-2 text-xs font-light rounded-full transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-1)',
            }}
          >
            Preferences
          </button>
          <button
            onClick={accept}
            className="flex-1 py-2 text-xs font-light rounded-full transition-colors"
            style={{
              background: 'var(--brand)',
              // Black on aurora-lime for WCAG AA contrast — white on
              // the brand color drops to ~2.4:1 (fails AA). Black
              // hits ~13:1.
              color: '#000',
              fontWeight: 400,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
