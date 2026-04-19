'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // We don't show errors here on purpose — the API returns 200
    // regardless so we can't distinguish hit vs miss. The
    // "check your inbox" state is the correct response for both.
    // In dev (NODE_ENV !== 'production') with no RESEND_API_KEY,
    // the API also returns `devResetLink` so we can render a
    // direct button instead of asking the user to check email.
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      // Only trust the dev-mode reset link when the user is actually on
      // localhost. A staging or preview deploy should never render this
      // banner (it would be a security leak — the reset token is in the
      // URL). The backend might still send the field for debugging, but
      // we refuse to render it outside local.
      const isLocalHost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1');
      if (data?.devResetLink && isLocalHost) setDevLink(data.devResetLink);
    } catch {}
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="If an account exists for that email, a reset link is on its way."
        footer={
          <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            ← Back to sign in
          </Link>
        }
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6">
              <path d="M4 6l8 6 8-6M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6M4 6a2 2 0 012-2h12a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[13px] font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            The reset link expires in 1 hour. If you don't see it within a few minutes, check your spam folder.
          </p>
          {devLink && (
            <div
              className="mt-6 p-4 rounded-xl text-left"
              style={{
                background: 'rgba(191,159,241,0.06)',
                border: '1px solid rgba(191,159,241,0.2)',
              }}
            >
              <p className="text-[10px] tracking-[0.18em] mb-2" style={{ color: 'var(--nova)' }}>
                DEV MODE · EMAIL NOT CONFIGURED
              </p>
              <p className="text-[11px] font-light mb-3" style={{ color: 'var(--text-3)' }}>
                Email delivery is disabled in this environment. Open the reset link directly:
              </p>
              <a
                href={devLink}
                className="inline-block text-xs font-light px-4 py-2 rounded-full transition-all"
                style={{
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand)',
                }}
              >
                Open reset link →
              </a>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-xs font-light mt-6 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            Try a different email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="you@company.com"
            autoComplete="email"
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-[13px] text-sm font-light rounded-full transition-all"
          style={{
            background: 'var(--brand-soft)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
            opacity: loading || !email ? 0.5 : 1,
          }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  );
}
