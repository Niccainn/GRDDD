'use client';
/**
 * In-app "please verify your email" banner — top-of-page nudge for
 * authenticated users whose Identity.emailVerifiedAt is still null.
 *
 * Mounted globally in LayoutShell so it shows on every authenticated
 * page (not on /sign-in, /sign-up, or the marketing landing — those
 * gate themselves via showChrome).
 *
 * Why a banner and not a hard block:
 *   lib/auth.ts:135 explains: we want the first-touch UX to keep
 *   working even if the verification email is delayed. So sign-in
 *   succeeds, the user can explore the workspace, and this banner
 *   stays visible until they verify or close the tab.
 *
 * Dismissal:
 *   Session-only (in-memory). We deliberately don't persist a
 *   "dismissed" flag — if the user is still unverified next time they
 *   load the app, we should ask again. The whole point of the banner
 *   is to keep the verification email present in their attention.
 */
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function VerifyEmailBanner() {
  const { user, refresh } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!user) return null;
  if (user.emailVerifiedAt) return null;
  if (!user.email) return null;
  if (dismissed) return null;

  async function handleResend() {
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not resend right now.');
        setState('error');
        return;
      }
      setState('sent');
      // Refresh auth so if the verification happened in another tab
      // between page load and resend click, we hide the banner now.
      refresh();
    } catch {
      setError('Connection error.');
      setState('error');
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-4 md:px-6 py-2.5 flex items-center gap-3 flex-wrap"
      style={{
        background: 'rgba(247,199,0,0.05)',
        borderBottom: '1px solid rgba(247,199,0,0.18)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
        <circle cx="7" cy="7" r="6" stroke="#F7C700" strokeWidth="1.2" />
        <path d="M7 4v3" stroke="#F7C700" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="7" cy="9.5" r="0.6" fill="#F7C700" />
      </svg>
      <p className="text-xs font-light flex-1 min-w-0" style={{ color: 'var(--text-1)' }}>
        {state === 'sent' ? (
          <>Check <span style={{ color: 'var(--text-2)' }}>{user.email}</span> — a fresh link is on the way (good for 24 hours).</>
        ) : (
          <>Verify your email to unlock outbound integrations and payment-bearing actions.</>
        )}
      </p>
      {state !== 'sent' ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={state === 'sending'}
          className="text-[11px] font-light px-3 py-1.5 rounded-full whitespace-nowrap transition-all"
          style={{
            background: 'rgba(247,199,0,0.12)',
            border: '1px solid rgba(247,199,0,0.28)',
            color: '#F7C700',
            opacity: state === 'sending' ? 0.5 : 1,
          }}
        >
          {state === 'sending' ? 'Sending…' : 'Resend email'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="w-6 h-6 inline-flex items-center justify-center rounded-full transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {state === 'error' && error ? (
        <p className="text-[11px] font-light w-full" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
