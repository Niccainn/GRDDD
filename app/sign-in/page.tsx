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
      // After sign-in: land the user on their primary Environment
      // rather than the generic /dashboard — that's the canonical
      // artifact of the product and every other surface is reachable
      // from it. Honor an explicit ?next= override (OAuth callbacks,
      // deep-links) ahead of the environment lookup.
      let target = next;
      if (target === '/dashboard') {
        try {
          const list = await fetch('/api/environments').then(r => r.json());
          const envs = Array.isArray(list) ? list : list?.environments ?? [];
          const first = envs[0];
          if (first?.slug) target = `/environments/${first.slug}`;
        } catch {
          /* fall back to /dashboard */
        }
      }
      router.push(target);
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
