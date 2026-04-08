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
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <svg width="40" height="52" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.12, marginBottom: 32 }}>
          <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
          <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
          <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
        </svg>
        <h1 className="text-3xl font-extralight tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
          Invisible infrastructure
        </h1>
        <p className="text-sm font-light mb-10" style={{ color: 'var(--text-3)' }}>
          Adaptive organizational intelligence
        </p>
        <div className="flex gap-3">
          <Link href="/sign-in" className="glass-pill px-6 py-2.5 text-sm font-light" style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
          <Link href="/sign-up" className="px-6 py-2.5 text-sm font-light rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Get started
          </Link>
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
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Environments', value: stats.environments },
                { label: 'Systems', value: stats.systems },
                { label: 'Workflows', value: stats.workflows },
                { label: 'Nova queries', value: stats.novaInteractions },
              ].map(s => (
                <div key={s.label}>
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
