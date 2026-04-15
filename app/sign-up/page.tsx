'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import GoogleButton from '@/components/auth/GoogleButton';
import PasswordField from '@/components/auth/PasswordField';

function scorePassword(pw: string): { label: string; tone: string; pct: number } {
  if (!pw) return { label: '', tone: 'var(--text-3)', pct: 0 };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const map = [
    { label: 'Too short', tone: 'var(--danger)', pct: 15 },
    { label: 'Weak', tone: 'var(--danger)', pct: 30 },
    { label: 'Fair', tone: '#F7C700', pct: 55 },
    { label: 'Good', tone: '#7193ED', pct: 75 },
    { label: 'Strong', tone: 'var(--brand)', pct: 95 },
    { label: 'Strong', tone: 'var(--brand)', pct: 100 },
  ];
  return map[score];
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center ambient-bg">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <SignUpInner />
    </Suspense>
  );
}

const CAPABILITIES = [
  { icon: '⚡', title: 'AI Workflows', desc: 'Multi-stage pipelines powered by Claude' },
  { icon: '📋', title: 'Task Management', desc: 'Board, list, and calendar views with subtasks' },
  { icon: '📄', title: 'Docs & Wiki', desc: 'Hierarchical knowledge base for your team' },
  { icon: '🎯', title: 'Goals & OKRs', desc: 'Track what matters with real-time progress' },
  { icon: '🔗', title: 'Integrations', desc: 'Connect Slack, GitHub, Stripe, and more' },
  { icon: '📊', title: 'Analytics', desc: 'Performance dashboards that update in real-time' },
];

function SignUpInner() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const oauthError = searchParams.get('error');
  const next = searchParams.get('next') || '/welcome';
  const strength = scorePassword(password);

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
        <div className="absolute top-[15%] left-[25%] w-[800px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[25%] w-[600px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
      </div>

      {/* Left panel — what you get (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-16 relative z-10">
        <div className="flex items-center gap-3">
          <svg width="28" height="36" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.3 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#sug)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#sug)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#sug)" strokeWidth="2"/>
            <defs><linearGradient id="sug" x1="0" y1="0" x2="79" y2="100"><stop offset="0%" stopColor="#7193ED"/><stop offset="100%" stopColor="#15AD70"/></linearGradient></defs>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-3)' }}>GRID</span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-extralight tracking-tight leading-[1.15] mb-6" style={{ color: 'var(--text-1)' }}>
            Everything you need<br />
            to run your<br />
            <span style={{ color: 'var(--brand)' }}>business.</span>
          </h1>
          <p className="text-base font-light leading-relaxed mb-10" style={{ color: 'var(--text-3)' }}>
            Replace scattered tools with one intelligent platform. GRID combines project management, documentation, AI automation, and analytics.
          </p>

          {/* Capability grid */}
          <div className="grid grid-cols-2 gap-4">
            {CAPABILITIES.map((cap, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{cap.icon}</span>
                <div>
                  <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{cap.title}</p>
                  <p className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-[11px] font-light" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
            Free forever for solo users
          </p>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>

      {/* Right panel — sign-up form */}
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
          <div
            className="rounded-3xl p-7 sm:p-9"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
            }}
          >
            <h2 className="text-xl font-light tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
              Create your workspace
            </h2>
            <p className="text-sm font-light mb-7" style={{ color: 'var(--text-3)' }}>
              Get started in 30 seconds
            </p>

            <GoogleButton label="Sign up with Google" next={next} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="glass-input w-full px-4 py-3 text-sm"
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
                  Work email
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
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
                  Password
                </label>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder="Min 12 characters"
                  autoComplete="new-password"
                  minLength={12}
                />
                {password && (
                  <div className="mt-2">
                    <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${strength.pct}%`, background: strength.tone }}
                      />
                    </div>
                    <p className="text-[10px] font-light mt-1 tracking-wide" style={{ color: strength.tone }}>
                      {strength.label}
                    </p>
                  </div>
                )}
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
                {loading ? 'Creating workspace…' : 'Create workspace'}
              </button>

              <p className="text-[10px] text-center font-light pt-1" style={{ color: 'var(--text-3)' }}>
                By continuing you agree to the{' '}
                <Link href="/terms" style={{ color: 'var(--text-2)' }}>Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>.
              </p>
            </form>
          </div>

          <p className="text-center mt-6 text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--brand)' }}>
              Sign in
            </Link>
          </p>

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
