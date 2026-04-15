'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import GoogleButton from '@/components/auth/GoogleButton';
import PasswordField from '@/components/auth/PasswordField';

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SignInInner />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center ambient-bg">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
    </div>
  );
}

const PROOF_POINTS = [
  {
    metric: '10x',
    label: 'faster workflow execution',
    detail: 'AI-powered stages process work in parallel',
  },
  {
    metric: '100%',
    label: 'brand-consistent output',
    detail: 'Nova learns your voice and stays on-brand',
  },
  {
    metric: '1',
    label: 'platform for everything',
    detail: 'Tasks, docs, goals, analytics, automations',
  },
];

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
      router.push(next);
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex ambient-bg relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[20%] left-[30%] w-[800px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
      </div>

      {/* Left panel — value proposition (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-16 relative z-10">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <svg width="28" height="36" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.3 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#sg)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#sg)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#sg)" strokeWidth="2"/>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="79" y2="100"><stop offset="0%" stopColor="#15AD70"/><stop offset="100%" stopColor="#7193ED"/></linearGradient></defs>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-3)' }}>GRID</span>
        </div>

        {/* Hero message */}
        <div className="max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-extralight tracking-tight leading-[1.15] mb-6" style={{ color: 'var(--text-1)' }}>
            The operating system<br />
            for your entire<br />
            <span style={{ color: 'var(--brand)' }}>business.</span>
          </h1>
          <p className="text-base font-light leading-relaxed mb-12" style={{ color: 'var(--text-3)' }}>
            Structure your work, automate operations, and let AI reason across everything — tasks, docs, goals, and workflows in one intelligent workspace.
          </p>

          {/* Proof points */}
          <div className="space-y-6">
            {PROOF_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(21,173,112,0.06)',
                    border: '1px solid rgba(21,173,112,0.12)',
                  }}
                >
                  <span className="text-lg font-light" style={{ color: 'var(--brand)' }}>
                    {point.metric}
                  </span>
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                    {point.label}
                  </p>
                  <p className="text-xs font-light mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {point.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof / trust */}
        <div className="flex items-center gap-6">
          <p className="text-[11px] font-light" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
            Trusted by teams building the future
          </p>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-6 sm:px-10 py-12 relative z-10">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="31" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.25 }}>
              <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
              <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
              <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
            </svg>
            <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-3)' }}>GRID</span>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Glass panel */}
          <div
            className="rounded-3xl p-7 sm:p-9"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
            }}
          >
            <h2 className="text-xl font-light tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
              Welcome back
            </h2>
            <p className="text-sm font-light mb-7" style={{ color: 'var(--text-3)' }}>
              Sign in to your workspace
            </p>

            <GoogleButton next={next} />

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
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Below form — sign-up CTA */}
          <p className="text-center mt-6 text-xs font-light" style={{ color: 'var(--text-3)' }}>
            No account?{' '}
            <Link
              href="/sign-up"
              className="transition-colors"
              style={{ color: 'var(--brand)' }}
            >
              Create your workspace
            </Link>
          </p>

          {/* Feature pills — quick scannable value props */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Free to start', 'No credit card', 'AI-powered'].map(tag => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-[10px] font-light tracking-wide"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-3)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
