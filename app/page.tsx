'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

type Stats = {
  environments: number;
  systems: number;
  workflows: number;
  novaInteractions: number;
  totalTokens: number;
};

const SETUP_STEPS = [
  { n: 1, title: 'Create an Environment', desc: 'Containers for your operations', href: '/environments', check: (s: Stats) => s.environments > 0 },
  { n: 2, title: 'Add a System', desc: 'Structured functions within environments', href: '/systems', check: (s: Stats) => s.systems > 0 },
  { n: 3, title: 'Build a Workflow', desc: 'Executable processes with stages', href: '/workflows', check: (s: Stats) => s.workflows > 0 },
  { n: 4, title: 'Ask Nova', desc: 'Intelligence that acts within your structure', href: '/nova', check: (s: Stats) => s.novaInteractions > 0 },
];

const CAPABILITIES = [
  { label: 'Environments', desc: 'Organizational containers that adapt to every team', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18M3 12h18"/></svg>
  )},
  { label: 'Systems', desc: 'Structured functions with health monitoring and intelligence', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4"/></svg>
  )},
  { label: 'Workflows', desc: 'Multi-stage processes that execute, validate, and self-correct', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M4 12h4l3-8 4 16 3-8h4"/></svg>
  )},
  { label: 'Nova', desc: 'AGI-class intelligence that reasons across your entire organization', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
  )},
];

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (user) {
      fetch('/api/settings').then(r => r.json()).then(d => setStats(d.stats)).catch(() => {});
    }
  }, [user]);

  const stepsComplete = stats ? SETUP_STEPS.filter(s => s.check(stats)).length : 0;
  const allDone = stepsComplete === SETUP_STEPS.length;

  // Unauthenticated landing
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[300px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />
        </div>

        {/* Logo mark — visible */}
        <div className="relative mb-8 animate-fade-in">
          <svg width="48" height="62" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.35 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#logo-grad)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#logo-grad)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#logo-grad)" strokeWidth="2"/>
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="79" y2="100">
                <stop offset="0%" stopColor="#15AD70" />
                <stop offset="100%" stopColor="#7193ED" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Tagline */}
        <div className="text-center max-w-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <p className="text-xs tracking-[0.25em] mb-4 uppercase" style={{ color: 'var(--brand)', opacity: 0.7 }}>
            Organizational Intelligence
          </p>
          <h1 className="text-4xl font-extralight tracking-tight mb-3 leading-tight" style={{ color: 'var(--text-1)' }}>
            The operating system<br />for how companies think
          </h1>
          <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
            GRID maps your organization into adaptive environments, intelligent systems, and self-correcting workflows — with an AI that reasons across everything.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Link href="/sign-in" className="glass-pill px-7 py-3 text-sm font-light" style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
          <Link href="/sign-up" className="px-7 py-3 text-sm font-light rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Get started
          </Link>
        </div>

        {/* Capability cards */}
        <div className="grid grid-cols-4 gap-3 max-w-3xl mt-20 animate-fade-in" style={{ animationDelay: '0.35s' }}>
          {CAPABILITIES.map(cap => (
            <div key={cap.label} className="glass p-5 text-center group">
              <div className="flex justify-center mb-3" style={{ color: 'var(--text-3)' }}>
                {cap.icon}
              </div>
              <p className="text-xs font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'var(--text-2)' }}>
                {cap.label}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Authenticated home
  return (
    <div className="min-h-screen px-12 py-16">
      <div className="max-w-2xl">
        {/* Greeting */}
        <div className="mb-14 animate-fade-in">
          <p className="text-xs tracking-[0.15em] mb-3" style={{ color: 'var(--text-3)' }}>WORKSPACE</p>
          <h1 className="text-3xl font-extralight tracking-tight">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
        </div>

        {/* Setup steps */}
        {!allDone && (
          <div className="mb-14 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>GETTING STARTED</p>
              {stats && (
                <span className="text-xs font-light" style={{ color: stepsComplete === 4 ? 'var(--brand)' : 'var(--text-3)' }}>
                  {stepsComplete} / {SETUP_STEPS.length}
                </span>
              )}
            </div>

            {stats && (
              <div className="h-px rounded-full mb-6 overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(stepsComplete / SETUP_STEPS.length) * 100}%`, background: 'var(--brand)' }} />
              </div>
            )}

            <div className="space-y-2">
              {SETUP_STEPS.map((step, i) => {
                const done = stats ? step.check(stats) : false;
                return (
                  <Link key={step.n} href={step.href}
                    className="glass float flex items-center gap-4 p-5 group"
                    style={{
                      opacity: stats && !done && stepsComplete < step.n - 1 ? 0.3 : 1,
                      pointerEvents: stats && !done && stepsComplete < step.n - 1 ? 'none' : 'auto',
                      animationDelay: `${0.15 + i * 0.05}s`,
                      background: done ? 'var(--brand-glow)' : undefined,
                      borderColor: done ? 'var(--brand-border)' : undefined,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: done ? 'var(--brand-soft)' : 'var(--glass)',
                        border: `1px solid ${done ? 'var(--brand-border)' : 'var(--glass-border)'}`,
                      }}>
                      {done ? (
                        <span style={{ color: 'var(--brand)', fontSize: '12px' }}>&#10003;</span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{step.n}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light mb-0.5 group-hover:text-white transition-colors"
                        style={{ color: done ? 'var(--text-2)' : 'var(--text-1)' }}>
                        {step.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{step.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats (when all done) */}
        {allDone && stats && (
          <div className="glass-brand p-6 mb-14 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="status-dot" style={{ background: 'var(--brand)' }} />
              <p className="text-sm font-light" style={{ color: 'var(--brand)' }}>Active workspace</p>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Envs', value: stats.environments },
                { label: 'Systems', value: stats.systems },
                { label: 'Workflows', value: stats.workflows },
                { label: 'Nova', value: stats.novaInteractions },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-extralight mb-0.5">{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>NAVIGATE</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Operate', desc: 'Cross-system intelligence', href: '/dashboard' },
              { label: 'Systems', desc: 'Organizational functions', href: '/systems' },
              { label: 'Workflows', desc: 'Process execution', href: '/workflows' },
              { label: 'Nova', desc: 'AGI workspace bridge', href: '/nova' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="glass glass-glow float p-6 group">
                <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'var(--text-2)' }}>
                  {item.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
