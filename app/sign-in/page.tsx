'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import AuthLayout from '@/components/auth/AuthLayout';
import GoogleButton from '@/components/auth/GoogleButton';
import PasswordField from '@/components/auth/PasswordField';

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthLayout title="Welcome back" subtitle="Sign in to your workspace"><div className="h-64" /></AuthLayout>}>
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

  // OAuth errors are returned via ?error= on the sign-in redirect.
  // Surface them once so the user knows why Google didn't take.
  const oauthError = searchParams.get('error');
  const next = searchParams.get('next') || '/dashboard';

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
      router.push(next);
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your workspace"
      footer={
        <>
          No account?{' '}
          <Link href="/sign-up" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            Create one
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[10px] uppercase tracking-[0.14em] font-light" style={{ color: 'var(--text-3)' }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

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
            background: 'var(--brand-soft)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
