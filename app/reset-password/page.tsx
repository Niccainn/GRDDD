'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import PasswordField from '@/components/auth/PasswordField';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This link is missing a token. Request a new one to continue."
        footer={
          <Link href="/forgot-password" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            Request new reset link
          </Link>
        }
      >
        <div className="text-center pt-2 pb-1">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.6" style={{ margin: '0 auto' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
          </svg>
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed.');
        setLoading(false);
        return;
      }
      setDone(true);
      // Short pause so the success state is visible, then bounce
      // into sign-in. We intentionally do NOT auto-sign-in — the
      // user confirms ownership by typing their new password.
      setTimeout(() => router.push('/sign-in'), 1800);
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Redirecting you to sign in…"
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="At least 8 characters. Mix in a number and a symbol for extra safety."
      footer={
        <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--text-2)' }}>
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            New password
          </label>
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            Confirm password
          </label>
          <PasswordField
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        {error && (
          <p className="text-xs px-3 py-2.5 rounded-lg font-light" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
            {error}
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
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs Suspense in Next.js App Router.
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
