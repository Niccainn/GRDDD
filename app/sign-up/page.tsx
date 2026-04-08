'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        setLoading(false);
        return;
      }
      refresh();
      router.push('/dashboard');
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 ambient-bg">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <svg width="28" height="36" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.15 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
          </svg>
        </div>

        <div className="glass-panel p-8">
          <h1 className="text-lg font-light text-center mb-1" style={{ color: 'var(--text-1)' }}>
            Create your workspace
          </h1>
          <p className="text-xs text-center mb-8" style={{ color: 'var(--text-3)' }}>
            Set up your organizational infrastructure
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm"
                placeholder="Your name"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm"
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-light rounded-full transition-all"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Creating workspace...' : 'Create workspace'}
            </button>
          </form>

          <p className="text-xs text-center mt-6 font-light" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--text-2)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
