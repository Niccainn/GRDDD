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

// ── Stat counter animation ──────────────────────────────────────────────────
function AnimatedStat({ value, suffix = '' }: { value: string; suffix?: string }) {
  return (
    <span className="stat-number-lg" style={{ color: 'var(--text-1)' }}>
      {value}<span style={{ color: 'var(--brand)', opacity: 0.8 }}>{suffix}</span>
    </span>
  );
}

// ── Marketing Site ──────────────────────────────────────────────────────────

function MarketingSite() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient gradient field */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[20%] w-[600px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
        <div className="absolute top-[60%] right-[15%] w-[500px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 md:py-5"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', background: 'rgba(8,8,12,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <svg width="24" height="31" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.4 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#nav-grad)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#nav-grad)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#nav-grad)" strokeWidth="2"/>
            <defs><linearGradient id="nav-grad" x1="0" y1="0" x2="79" y2="100"><stop offset="0%" stopColor="#15AD70"/><stop offset="100%" stopColor="#7193ED"/></linearGradient></defs>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-2)' }}>GRID</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#product" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Product</a>
          <a href="#impact" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Impact</a>
          <a href="#thesis" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Thesis</a>
          <Link href="/pricing" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Pricing</Link>
          <Link href="/sign-in" className="text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Sign in</Link>
          <a href="#waitlist" className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Request access
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 md:px-8 pt-20 relative">
        <div className="text-center max-w-3xl">
          <p className="text-[10px] tracking-[0.4em] uppercase mb-6 animate-fade-in" style={{ color: 'var(--brand)', opacity: 0.6 }}>
            The End of Operational Overhead
          </p>
          <h1 className="text-5xl md:text-6xl font-extralight tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            One person.<br />
            <span style={{ color: 'var(--brand)' }}>The output of an entire team.</span>
          </h1>
          <p className="text-base font-light leading-relaxed max-w-xl mx-auto mb-10 animate-fade-in" style={{ color: 'var(--text-2)', animationDelay: '0.2s' }}>
            GRID is the operating system for organizational intelligence. It maps your company into adaptive environments, self-correcting workflows, and an AI that reasons across everything — replacing project managers, ops analysts, and content teams with structure.
          </p>
          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <a href="#waitlist" className="px-8 py-3.5 text-sm font-light rounded-full transition-all"
              style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
              Request early access
            </a>
            <a href="#product" className="glass-pill px-8 py-3.5 text-sm font-light" style={{ color: 'var(--text-2)' }}>
              See how it works
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="w-px h-12 mx-auto mb-2" style={{ background: 'linear-gradient(180deg, transparent, var(--glass-border))' }} />
          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-3)' }}>Scroll</p>
        </div>
      </section>

      {/* ═══ IMPACT STATS ═══ */}
      <section id="impact" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: 'var(--text-3)' }}>
            Measured Impact
          </p>
          <div className="grid grid-cols-4 gap-6 mb-16">
            {[
              { value: '80', suffix: '%', label: 'Reduction in operational overhead', sub: 'PM, ops, analytics roles' },
              { value: '32', suffix: 'x', label: 'Faster content production', sub: 'Research to publish' },
              { value: '$600', suffix: 'K', label: 'Annual savings per company', sub: '50-person organization' },
              { value: '99', suffix: '%', label: 'Fewer status meetings', sub: 'Dashboard replaces standups' },
            ].map(stat => (
              <div key={stat.label} className="glass-deep p-6 text-center">
                <AnimatedStat value={stat.value} suffix={stat.suffix} />
                <p className="text-xs font-light mt-3 mb-1" style={{ color: 'var(--text-2)' }}>{stat.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Job replacement grid */}
          <div className="glass-deep p-8 rounded-2xl">
            <p className="text-xs tracking-[0.12em] mb-6" style={{ color: 'var(--text-3)' }}>ROLES GRID ABSORBS</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { role: 'Project Manager', saving: '$75K–$140K', efficiency: '90%', desc: 'Status tracking, task boards, sprint planning — automated by Nova + Kanban widgets' },
                { role: 'Social Media Manager', saving: '$50K–$90K', efficiency: '360x faster', desc: 'Copy, scheduling, analytics, multi-platform publishing — one workflow execution' },
                { role: 'Operations Analyst', saving: '$65K–$110K', efficiency: '720x faster', desc: 'Data pulling, reporting, trend analysis — Nova generates in 30 seconds' },
                { role: 'Content Strategist', saving: '$70K–$120K', efficiency: '75%', desc: 'Research, editorial planning, briefing, review — 4-stage workflow replaces the cycle' },
              ].map(job => (
                <div key={job.role} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{job.role}</span>
                    <span className="tag tag-status-on-track">{job.efficiency}</span>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-3)' }}>{job.desc}</p>
                  <p className="text-xs" style={{ color: 'var(--brand)', opacity: 0.7 }}>Saves {job.saving}/year</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT ═══ */}
      <section id="product" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>How It Works</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              Every environment is a living cell
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Your organization becomes a system of adaptive environments — each one a dashboard of real-time widgets that replace meetings, spreadsheets, and status updates.
            </p>
          </div>

          {/* Architecture */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { n: '01', title: 'Environments', desc: 'Organizational containers — Operations, Marketing, Product. Each adapts to its team. White-label ready.', color: '#15AD70' },
              { n: '02', title: 'Systems', desc: 'Structured functions within environments. Health monitoring, goal tracking, intelligence — all computed from real data.', color: '#7193ED' },
              { n: '03', title: 'Workflows', desc: 'Multi-stage executable processes. Nova runs each stage, validates output, and delivers real artifacts — not summaries.', color: '#BF9FF1' },
            ].map(item => (
              <div key={item.n} className="glass-deep p-6">
                <span className="text-[10px] tracking-[0.2em] mb-4 block" style={{ color: item.color, opacity: 0.6 }}>{item.n}</span>
                <h3 className="text-base font-light mb-2" style={{ color: 'var(--text-1)' }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Nova */}
          <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(191,159,241,0.12)', border: '1px solid rgba(191,159,241,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-light" style={{ color: 'var(--text-1)' }}>Nova</h3>
                  <p className="text-[10px]" style={{ color: '#BF9FF1', opacity: 0.6 }}>AGI Operations Engine</p>
                </div>
              </div>
              <p className="text-sm font-light leading-relaxed mb-6 max-w-xl" style={{ color: 'var(--text-2)' }}>
                Not a chatbot. A constraint engine that reasons across your entire organization. Nova reads every system, every workflow, every signal — and acts. It generates reports, triages incoming work, executes multi-stage workflows, and validates output against your identity constraints.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  'Cross-system reasoning',
                  '11 operational tools',
                  'Quality validation scoring',
                  'Memory + context retention',
                  'Real-time streaming execution',
                  'Automatic signal triage',
                ].map(cap => (
                  <div key={cap} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#BF9FF1', opacity: 0.5 }} />
                    {cap}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-4 text-center" style={{ color: 'var(--text-3)' }}>Use Cases</p>
          <h2 className="text-3xl font-extralight tracking-tight mb-16 text-center">
            Every department. One system.
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { dept: 'Marketing', workflow: 'Social Media Campaign', stages: 'Narrative → Assets → Review → Publish', result: 'Full multi-platform campaign in 3 minutes. Instagram, Facebook, LinkedIn — copy, scheduling, analytics.', color: '#FF6B6B' },
              { dept: 'Content', workflow: 'Blog Post Pipeline', stages: 'Research → Draft → Review → Publish', result: 'SEO-optimized blog posts from brief to publish-ready. Nova writes, validates, and prepares metadata.', color: '#7193ED' },
              { dept: 'Operations', workflow: 'Client Onboarding', stages: 'Discovery → Setup → Training → Handoff', result: 'Structured onboarding that self-reports progress. Health scores track client engagement in real time.', color: '#15AD70' },
              { dept: 'Engineering', workflow: 'Sprint Cycle', stages: 'Planning → Development → Review → Deploy', result: 'Sprint planning generated by Nova. Velocity tracked. Blockers surfaced automatically from signals.', color: '#BF9FF1' },
            ].map(uc => (
              <div key={uc.dept} className="glass-deep p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: uc.color, opacity: 0.4 }} />
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: uc.color }} />
                  <span className="text-xs tracking-[0.1em] uppercase" style={{ color: uc.color, opacity: 0.7 }}>{uc.dept}</span>
                </div>
                <h3 className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>{uc.workflow}</h3>
                <p className="text-[10px] font-light mb-3 px-2 py-1 rounded inline-block" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>
                  {uc.stages}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{uc.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THESIS ═══ */}
      <section id="thesis" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--text-3)' }}>The Thesis</p>
          <h2 className="text-3xl font-extralight tracking-tight leading-snug mb-8">
            When intelligence becomes infinite,<br />
            <span style={{ color: 'var(--brand)' }}>structure becomes the only advantage.</span>
          </h2>
          <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
            AI performance is a function of environmental structure, not model capability. Better models do not fix broken systems. More data does not create alignment. Only structure does.
          </p>
          <p className="text-sm font-light leading-relaxed mb-12" style={{ color: 'var(--text-2)' }}>
            GRID encodes this principle into software. Identity constrains the system. Infrastructure enables it. Intelligence adapts it. Three variables. One equation. The minimum viable condition for organizational adaptation.
          </p>
          <div className="glass-deep p-8 rounded-2xl text-left inline-block">
            <p className="text-xs tracking-[0.15em] mb-4" style={{ color: 'var(--text-3)' }}>THE GRID EQUATION</p>
            <p className="text-2xl font-extralight tracking-tight mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--text-2)' }}>S</span> <span style={{ color: 'var(--text-3)' }}>=</span> <span style={{ color: '#15AD70' }}>f</span><span style={{ color: 'var(--text-3)' }}>(</span><span style={{ color: '#7193ED' }}>I<sub>d</sub></span><span style={{ color: 'var(--text-3)' }}>,</span> <span style={{ color: '#BF9FF1' }}>I<sub>f</sub></span><span style={{ color: 'var(--text-3)' }}>,</span> <span style={{ color: '#F7C700' }}>I<sub>n</sub></span><span style={{ color: 'var(--text-3)' }}>)</span>
            </p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><span style={{ color: '#7193ED' }}>Identity</span><span style={{ color: 'var(--text-3)' }}> — constrains</span></div>
              <div><span style={{ color: '#BF9FF1' }}>Infrastructure</span><span style={{ color: 'var(--text-3)' }}> — enables</span></div>
              <div><span style={{ color: '#F7C700' }}>Intelligence</span><span style={{ color: 'var(--text-3)' }}> — adapts</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WAITLIST CTA ═══ */}
      <section id="waitlist" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
            Early Access
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-4">
            Request access to GRID
          </h2>
          <p className="text-sm font-light mb-10" style={{ color: 'var(--text-2)' }}>
            We&apos;re onboarding select organizations who want to operate at the frontier of organizational intelligence.
          </p>

          {submitted ? (
            <div className="glass-deep p-8 rounded-2xl animate-fade-in">
              <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)' }}>
                <span style={{ color: 'var(--brand)' }}>&#10003;</span>
              </div>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>You&apos;re on the list</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>We&apos;ll reach out when your access is ready.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="glass-input flex-1 px-5 py-3.5 text-sm"
              />
              <button
                onClick={() => { if (email.includes('@')) setSubmitted(true); }}
                className="px-6 py-3.5 text-sm font-light rounded-xl transition-all flex-shrink-0"
                style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
                Request access
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-5 md:px-8" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="16" height="21" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.2 }}>
              <rect x="2" y="2" width="75" height="96" rx="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="currentColor" strokeWidth="2"/>
              <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>GRID Systems Inc.</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
            Adaptive organizational intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Authenticated Home ──────────────────────────────────────────────────────

function AuthenticatedHome({ user, stats, stepsComplete, allDone }: {
  user: { name: string };
  stats: Stats | null;
  stepsComplete: number;
  allDone: boolean;
}) {
  return (
    <div className="min-h-screen px-12 py-16">
      <div className="max-w-2xl">
        <div className="mb-14 animate-fade-in">
          <p className="text-xs tracking-[0.15em] mb-3" style={{ color: 'var(--text-3)' }}>WORKSPACE</p>
          <h1 className="text-3xl font-extralight tracking-tight">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
        </div>

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
                      background: done ? 'var(--brand-glow)' : undefined,
                      borderColor: done ? 'var(--brand-border)' : undefined,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: done ? 'var(--brand-soft)' : 'var(--glass)', border: `1px solid ${done ? 'var(--brand-border)' : 'var(--glass-border)'}` }}>
                      {done ? <span style={{ color: 'var(--brand)', fontSize: '12px' }}>&#10003;</span> : <span className="text-xs" style={{ color: 'var(--text-3)' }}>{step.n}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light mb-0.5 group-hover:text-white transition-colors" style={{ color: done ? 'var(--text-2)' : 'var(--text-1)' }}>{step.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{step.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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

        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>NAVIGATE</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Operate', desc: 'Cross-system intelligence', href: '/dashboard' },
              { label: 'Systems', desc: 'Organizational functions', href: '/systems' },
              { label: 'Workflows', desc: 'Process execution', href: '/workflows' },
              { label: 'Nova', desc: 'AGI workspace bridge', href: '/nova' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="glass glass-glow float p-6 group">
                <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'var(--text-2)' }}>{item.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────

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

  if (!user) return <MarketingSite />;
  return <AuthenticatedHome user={user} stats={stats} stepsComplete={stepsComplete} allDone={allDone} />;
}
