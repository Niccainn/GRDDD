'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const CAPABILITIES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    title: 'AI Workflows',
    desc: 'Multi-stage pipelines powered by Claude. Research, draft, review, and publish — automated.',
    accent: '#BF9FF1',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Task Management',
    desc: 'Board, list, and calendar views. Subtasks, dependencies, bulk actions, and templates.',
    accent: '#C8F26B',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" strokeLinejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round"/>
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Docs & Wiki',
    desc: 'Hierarchical knowledge base. Rich editor, team collaboration, environment-scoped.',
    accent: '#7193ED',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
    title: 'Goals & OKRs',
    desc: 'Track what matters. Real-time progress, milestones, and alignment across teams.',
    accent: '#F7C700',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Analytics',
    desc: 'Live dashboards. Workflow performance, team velocity, campaign metrics — all in one view.',
    accent: '#34d399',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="9" cy="12" r="4"/>
        <circle cx="15" cy="12" r="4"/>
      </svg>
    ),
    title: 'Integrations',
    desc: 'Connect Slack, GitHub, Stripe, Google, Salesforce, and more. OAuth or API key.',
    accent: '#f97316',
  },
];

const STATS = [
  { value: '6', label: 'Core modules', sub: 'tasks, docs, goals, analytics, workflows, integrations' },
  { value: '17', label: 'Integrations', sub: 'OAuth + API key providers ready to connect' },
  { value: '∞', label: 'Environments', sub: 'isolated workspaces for every team or project' },
];

export default function AccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center ambient-bg">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen ambient-bg relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #C8F26B, transparent 70%)' }} />
        <div className="absolute top-[60%] left-[20%] w-[600px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[400px] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-10 py-4 transition-all duration-300"
        style={{
          background: scrolled ? 'var(--nav-bg)' : 'transparent',
          backdropFilter: scrolled ? 'blur(40px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--nav-border)' : '1px solid transparent',
        }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="24" height="31" viewBox="0 0 79 100" fill="none" style={{ color: 'var(--text-1)' }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="currentColor" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-2)' }}>GRID</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
          <Link href="/#waitlist" className="text-xs font-light px-5 py-2.5 rounded-full transition-all"
            style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-32 md:pt-44 pb-20 md:pb-28 px-5 md:px-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(200,242,107,0.06)', border: '1px solid rgba(200,242,107,0.12)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C8F26B' }} />
            <span className="text-[11px] font-light tracking-wide" style={{ color: 'var(--brand)' }}>
              Now live — start building for free
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight leading-[1.1] mb-6" style={{ color: 'var(--text-1)' }}>
            The operating system<br className="hidden sm:block" />
            {' '}for your entire{' '}
            <span style={{ color: 'var(--brand)' }}>business</span>
          </h1>

          <p className="text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-3)' }}>
            Replace scattered tools with one intelligent workspace. Tasks, docs, goals, workflows, analytics, and AI automation — unified under a single operational layer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/#waitlist" className="w-full sm:w-auto px-8 py-3.5 text-sm font-normal rounded-full text-center transition-all"
              style={{ background: 'var(--brand)', color: '#000' }}>
              Start building — it&apos;s free
            </Link>
            <Link href="/sign-in" className="w-full sm:w-auto px-8 py-3.5 text-sm font-light rounded-full text-center transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-2)' }}>
              Sign in to workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-3xl md:text-4xl font-extralight mb-1" style={{ color: 'var(--brand)' }}>
                  {stat.value}
                </div>
                <div className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>
                  {stat.label}
                </div>
                <div className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="relative z-10 px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extralight tracking-tight mb-3" style={{ color: 'var(--text-1)' }}>
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-3)' }}>
              Six integrated modules that work together as one system. No plugin hell. No integration tax.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `${cap.accent}12`,
                    color: cap.accent,
                    border: `1px solid ${cap.accent}20`,
                  }}
                >
                  {cap.icon}
                </div>
                <h3 className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>
                  {cap.title}
                </h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI section */}
      <section className="relative z-10 px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-8 md:p-12 relative overflow-hidden"
            style={{
              background: 'rgba(191,159,241,0.04)',
              border: '1px solid rgba(191,159,241,0.10)',
            }}
          >
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
                style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.15)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span className="text-[10px] font-light tracking-wide" style={{ color: '#BF9FF1' }}>
                  POWERED BY CLAUDE
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-extralight tracking-tight mb-4" style={{ color: 'var(--text-1)' }}>
                Nova — your AI operations engine
              </h2>
              <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-3)' }}>
                Nova processes multi-stage workflows, generates brand-consistent content, analyzes data, and produces real deliverables — not descriptions of work. It learns your brand voice and stays on-message across every output.
              </p>

              <div className="space-y-3">
                {[
                  'Multi-stage pipeline execution with validation scoring',
                  'Brand voice memory — tone, audience, values built in',
                  'BYOK — bring your own Anthropic API key, zero platform cost',
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extralight tracking-tight mb-4" style={{ color: 'var(--text-1)' }}>
            Ready to build?
          </h2>
          <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
            Free to start. No credit card required. Your workspace is ready in 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/#waitlist" className="w-full sm:w-auto px-8 py-3.5 text-sm font-normal rounded-full text-center transition-all"
              style={{ background: 'var(--brand)', color: '#000' }}>
              Create your workspace
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Free forever for solo', 'Unlimited environments', 'BYOK AI — zero markup'].map(tag => (
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
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-5 md:px-10 py-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)', opacity: 0.4 }}>
          GRID Systems Inc.
        </span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)', opacity: 0.4 }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)', opacity: 0.4 }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
