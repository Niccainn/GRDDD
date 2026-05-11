'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import OAuthProviders from '@/components/auth/OAuthProviders';
import PasswordField from '@/components/auth/PasswordField';
import AuthLayout from '@/components/auth/AuthLayout';

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthLayout title="Sign in to GRID" subtitle="Your workspace is waiting"><div className="h-64" /></AuthLayout>}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const oauthError = searchParams.get('error');
  const next = searchParams.get('next') || '/dashboard';
  // Banner from /api/auth/verify-email outcomes — see that route for
  // the param values.  Surfacing them here so users coming back from a
  // stale verification link don't end up at a blank sign-in form
  // wondering why the link "didn't work".
  const verifyOutcome = searchParams.get('verify');
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  async function handleResend() {
    if (resendState === 'sending' || !resendEmail) return;
    setResendState('sending');
    setResendError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResendError(data.error || 'Could not resend right now.');
        setResendState('error');
        return;
      }
      setResendState('sent');
    } catch {
      setResendError('Connection error.');
      setResendState('error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed');
        setLoading(false);
        return;
      }
      refresh();
      // After sign-in: land the user on /dashboard — the cross-
      // environment home with the summary widgets, Atrium prompt,
      // sample-data banner, etc. Earlier behaviour fetched envs and
      // jumped directly to /environments/<first-slug>, which buried
      // the home page entirely (a user who'd ever signed in could
      // never see it again without ?stay=1). The Environment is one
      // sidebar click away from the home; the home is not reachable
      // by URL navigation if we redirect away from it.
      //
      // ?next= still overrides — OAuth callbacks and deep-links
      // depend on it.
      router.push(next);
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in to GRID"
      subtitle="A workspace that acts"
      footer={
        <>
          New to GRID?{' '}
          <Link href="/sign-up" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            Request access
          </Link>
        </>
      }
    >
      {verifyOutcome ? (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-xs font-light"
          style={{
            background: 'rgba(200,242,107,0.06)',
            border: '1px solid rgba(200,242,107,0.18)',
            color: 'var(--text-1)',
          }}
        >
          {verifyOutcome === 'expired' && (
            <>
              <p className="mb-3">That verification link has expired. Send yourself a fresh one — it&apos;s good for 24 hours.</p>
              <ResendBox
                email={resendEmail}
                onEmail={setResendEmail}
                state={resendState}
                error={resendError}
                onResend={handleResend}
              />
            </>
          )}
          {verifyOutcome === 'missing' && (
            <p>That verification link was malformed. Sign in below — we can resend a fresh email if you need one.</p>
          )}
          {verifyOutcome === 'rate-limited' && (
            <p>Too many verification attempts from this address. Try again in a few minutes.</p>
          )}
          {verifyOutcome === 'ok' && (
            <p>
              <span style={{ color: 'var(--brand)' }}>Email verified.</span> Sign in below to land in your workspace.
            </p>
          )}
        </div>
      ) : null}

      <OAuthProviders next={next} />

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
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-light" style={{ color: 'var(--text-3)' }}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-light transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              Forgot password?
            </Link>
          </div>
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>

        {(error || oauthError) && (
          <p className="text-xs px-3 py-2.5 rounded-lg font-light" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
            {error || decodeURIComponent(oauthError || '')}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[13px] text-sm font-light rounded-full transition-all"
          style={{
            background: 'var(--brand)',
            color: '#000',
            fontWeight: 400,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Signing in\u2026' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}

function ResendBox({
  email,
  onEmail,
  state,
  error,
  onResend,
}: {
  email: string;
  onEmail: (v: string) => void;
  state: 'idle' | 'sending' | 'sent' | 'error';
  error: string;
  onResend: () => void;
}) {
  if (state === 'sent') {
    return (
      <p className="text-[11px] font-light" style={{ color: 'var(--text-2)' }}>
        Check your inbox. The new link is good for 24 hours.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => onEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className="glass-input flex-1 px-3 py-2 text-xs"
          disabled={state === 'sending'}
        />
        <button
          type="button"
          onClick={onResend}
          disabled={state === 'sending' || !email}
          className="px-4 py-2 text-xs font-light rounded-full transition-all whitespace-nowrap"
          style={{
            background: 'var(--brand)',
            color: '#000',
            opacity: state === 'sending' || !email ? 0.5 : 1,
          }}
        >
          {state === 'sending' ? 'Sending…' : 'Resend'}
        </button>
      </div>
      {state === 'error' && error ? (
        <p className="text-[11px] font-light" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
