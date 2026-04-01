'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  environments: number;
  systems: number;
  workflows: number;
  novaInteractions: number;
  totalTokens: number;
};

const SETUP_STEPS = [
  {
    n: 1,
    title: 'Create an Environment',
    desc: 'Environments are containers for your business operations — e.g. Marketing, Product, Client Services.',
    href: '/environments',
    cta: 'Create environment →',
    check: (s: Stats) => s.environments > 0,
  },
  {
    n: 2,
    title: 'Add a System',
    desc: 'Systems are structured functions within an environment — e.g. Content System, Brand System.',
    href: '/systems',
    cta: 'Add system →',
    check: (s: Stats) => s.systems > 0,
  },
  {
    n: 3,
    title: 'Build a Workflow',
    desc: 'Workflows are executable processes with stages. Use templates or build your own.',
    href: '/workflows',
    cta: 'Create workflow →',
    check: (s: Stats) => s.workflows > 0,
  },
  {
    n: 4,
    title: 'Ask Nova',
    desc: 'Open a system, type a request in Nova, and watch it read data, create workflows, and take action.',
    href: '/systems',
    cta: 'Open a system →',
    check: (s: Stats) => s.novaInteractions > 0,
  },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setStats(d.stats));
  }, []);

  const stepsComplete = stats ? SETUP_STEPS.filter(s => s.check(stats)).length : 0;
  const allDone = stepsComplete === SETUP_STEPS.length;

  return (
    <div className="min-h-screen px-12 py-16">
      <div className="max-w-2xl">
        {/* Logo + title */}
        <div className="flex items-center gap-4 mb-12">
          <svg width="32" height="41" viewBox="0 0 79 100" fill="none">
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
          </svg>
          <div>
            <p className="text-xs tracking-[0.22em] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>GRID</p>
            <h1 className="text-2xl font-extralight tracking-tight">Adaptive Organizational Infrastructure</h1>
          </div>
        </div>

        {/* Setup checklist */}
        {!allDone && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>GETTING STARTED</p>
              {stats && (
                <span className="text-xs font-light" style={{ color: stepsComplete === 4 ? '#15AD70' : 'var(--text-tertiary)' }}>
                  {stepsComplete} / {SETUP_STEPS.length} complete
                </span>
              )}
            </div>

            {/* Progress bar */}
            {stats && (
              <div className="h-0.5 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stepsComplete / SETUP_STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #15AD70, #68D0CA)' }} />
              </div>
            )}

            <div className="space-y-2">
              {SETUP_STEPS.map(step => {
                const done = stats ? step.check(stats) : false;
                return (
                  <Link key={step.n} href={step.href}
                    className="flex items-start gap-4 p-5 rounded-xl group transition-all"
                    style={{
                      background: done ? 'rgba(21,173,112,0.04)' : 'var(--surface)',
                      border: `1px solid ${done ? 'rgba(21,173,112,0.15)' : 'var(--border)'}`,
                      opacity: stats && !done && stepsComplete < step.n - 1 ? 0.4 : 1,
                      pointerEvents: stats && !done && stepsComplete < step.n - 1 ? 'none' : 'auto',
                    }}>
                    {/* Step indicator */}
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: done ? 'rgba(21,173,112,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${done ? 'rgba(21,173,112,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {done ? (
                        <span style={{ color: '#15AD70', fontSize: '11px' }}>✓</span>
                      ) : (
                        <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>{step.n}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light mb-0.5 group-hover:text-white transition-colors"
                        style={{ color: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)' }}>
                        {done ? <s style={{ textDecorationColor: 'rgba(255,255,255,0.2)' }}>{step.title}</s> : step.title}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{step.desc}</p>
                    </div>
                    {!done && (
                      <span className="text-xs flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {step.cta}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* All done state */}
        {allDone && stats && (
          <div className="mb-12 p-6 rounded-xl"
            style={{ background: 'rgba(21,173,112,0.05)', border: '1px solid rgba(21,173,112,0.15)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ background: '#15AD70' }} />
              <p className="text-sm font-light" style={{ color: '#15AD70' }}>Setup complete</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Environments', value: stats.environments },
                { label: 'Systems', value: stats.systems },
                { label: 'Workflows', value: stats.workflows },
                { label: 'Nova interactions', value: stats.novaInteractions },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-extralight mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>NAVIGATE</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Operate', desc: 'Cross-system dashboard with Global Nova', href: '/dashboard', accent: 'rgba(255,255,255,0.05)' },
              { label: 'Systems', desc: 'Manage your operational systems', href: '/systems', accent: 'rgba(255,255,255,0.05)' },
              { label: 'Workflows', desc: 'Templates, stage execution, run history', href: '/workflows', accent: 'rgba(255,255,255,0.05)' },
              { label: 'Nova', desc: 'Intelligence log across all interactions', href: '/nova', accent: 'rgba(191,159,241,0.06)' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="p-5 rounded-xl group transition-all"
                style={{ background: item.accent, border: '1px solid var(--border)' }}>
                <p className="text-sm font-light mb-0.5 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {item.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Feature hints */}
        <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>TIPS</p>
          <div className="space-y-2.5">
            {[
              { key: '⌘K', label: 'Command palette — search everything, navigate anywhere' },
              { key: 'Nova', label: 'Ask Nova to create workflows, analyse systems, or flag health issues' },
              { key: 'Run', label: 'Run any workflow with custom input — Nova processes each stage with AI' },
              { key: 'Alerts', label: 'Bell icon shows health drift, stalled runs, and paused workflows' },
            ].map(tip => (
              <div key={tip.key} className="flex items-start gap-3">
                <kbd className="text-xs px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontFamily: 'inherit', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {tip.key}
                </kbd>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{tip.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
