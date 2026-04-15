'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleWaitlist() {
    if (!email.includes('@')) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

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
          <a href="#problem" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Why</a>
          <a href="#how" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>How</a>
          <a href="#proof" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Proof</a>
          <a href="#waitlist" className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Request early access
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 md:px-8 pt-20 relative">
        <div className="text-center max-w-3xl">
          <p className="text-[10px] tracking-[0.4em] uppercase mb-6 animate-fade-in" style={{ color: 'var(--brand)', opacity: 0.6 }}>
            Early Access — Limited Availability
          </p>
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            See how your business<br />
            <span style={{ color: 'var(--brand)' }}>actually works.</span>
          </h1>
          <p className="text-base font-light leading-relaxed max-w-xl mx-auto mb-10 animate-fade-in" style={{ color: 'var(--text-2)', animationDelay: '0.2s' }}>
            GRID helps teams and AI learn the business together — so the company becomes
            more efficient, more adaptive, and more intelligent over time.
          </p>
          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <a href="#waitlist" className="px-8 py-3.5 text-sm font-light rounded-full transition-all"
              style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
              Request early access
            </a>
            <a href="#how" className="glass-pill px-8 py-3.5 text-sm font-light" style={{ color: 'var(--text-2)' }}>
              How it works
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="w-px h-12 mx-auto mb-2" style={{ background: 'linear-gradient(180deg, transparent, var(--glass-border))' }} />
          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-3)' }}>Scroll</p>
        </div>
      </section>

      {/* ═══ THE PROBLEM ═══ */}
      <section id="problem" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: 'var(--text-3)' }}>
            The Problem
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-6 text-center leading-snug">
            You have more tools than ever.<br />
            <span style={{ color: 'var(--text-2)' }}>Your work is harder to see than ever.</span>
          </h2>
          <p className="text-sm font-light max-w-lg mx-auto text-center mb-16" style={{ color: 'var(--text-3)' }}>
            Work is scattered across tabs, threads, and tools. Systems drift without anyone noticing. AI generates output, but nobody learns why it worked or how to repeat it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                before: 'Work lives in 12 different tools',
                after: 'Every system, workflow, and outcome in one place',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                ),
              },
              {
                before: 'Nobody notices when systems drift',
                after: 'Health scores surface problems before they spread',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
              },
              {
                before: 'AI generates output you can\'t explain',
                after: 'You see what AI did, why it worked, and how to improve it',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                ),
              },
              {
                before: 'Adaptation requires a meeting or a hire',
                after: 'The platform learns your patterns and evolves with you',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                ),
              },
            ].map(item => (
              <div key={item.before} className="glass-deep p-6 rounded-2xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>
                  {item.icon}
                </div>
                <p className="text-xs font-light mb-3 line-through" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                  {item.before}
                </p>
                <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
                  {item.after}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE DUAL-ENDED LOOP ═══ */}
      <section id="how" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>How It Works</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4 leading-snug">
              You learn the system.<br />
              <span style={{ color: 'var(--brand)' }}>The system learns you.</span>
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              GRID is a co-learning operating system. You build better workflows. AI adapts to your patterns. The business gets clearer, faster, and more resilient — every week.
            </p>
          </div>

          {/* The loop visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Human side */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: '#7193ED', opacity: 0.4 }} />
              <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: '#7193ED', opacity: 0.6 }}>You Learn</p>
              <div className="space-y-5">
                {[
                  { step: 'See', desc: 'Understand how your business actually operates — not how you think it does.' },
                  { step: 'Design', desc: 'Build workflows that match reality. Test new approaches with real data.' },
                  { step: 'Improve', desc: 'Watch what works and what doesn\'t. Every execution teaches you something.' },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'rgba(113,147,237,0.12)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.2)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.step}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI side */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: '#BF9FF1', opacity: 0.4 }} />
              <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: '#BF9FF1', opacity: 0.6 }}>AI Learns</p>
              <div className="space-y-5">
                {[
                  { step: 'Observe', desc: 'Nova reads your systems, workflows, and signals. It maps how your business runs.' },
                  { step: 'Adapt', desc: 'It remembers your patterns, your brand, your preferences — and improves its output.' },
                  { step: 'Act', desc: 'It executes workflows, triages incoming work, and surfaces what needs attention.' },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'rgba(191,159,241,0.12)', color: '#BF9FF1', border: '1px solid rgba(191,159,241,0.2)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.step}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The outcome */}
          <div className="glass-deep p-8 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: '#7193ED' }} />
              <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, #7193ED, #BF9FF1)' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#BF9FF1' }} />
            </div>
            <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              The result is compounding value. You become better at running work with AI. AI becomes better at running work for you. The business gets clearer every week.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT BECOMES VISIBLE ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>Operational Clarity</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              Hidden work becomes visible
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Most teams can&apos;t see where time goes, which systems are drifting, or what AI is actually doing. GRID makes all of it measurable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Efficiency over time',
                value: 'Week 1 vs Week 8',
                desc: 'See exactly how much faster your workflows execute as AI and your team learn together.',
                color: '#15AD70',
              },
              {
                label: 'System health',
                value: 'Real-time',
                desc: 'Health scores across every part of your business. Know where to focus before something breaks.',
                color: '#7193ED',
              },
              {
                label: 'AI fluency',
                value: 'Compounding',
                desc: 'Track how your team builds better prompts, better workflows, and better AI-assisted decisions over time.',
                color: '#BF9FF1',
              },
            ].map(item => (
              <div key={item.label} className="glass-deep p-6 rounded-2xl text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-4" style={{ background: item.color }} />
                <p className="text-2xl font-extralight mb-1 tracking-tight" style={{ color: 'var(--text-1)' }}>{item.value}</p>
                <p className="text-xs font-light mb-3" style={{ color: item.color, opacity: 0.7 }}>{item.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROOF / CASE STUDY ═══ */}
      <section id="proof" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: 'var(--text-3)' }}>
            What This Looks Like
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-12 text-center leading-snug">
            How a small team made<br />
            <span style={{ color: 'var(--brand)' }}>operational chaos visible.</span>
          </h2>

          <div className="space-y-4">
            {[
              {
                week: 'Week 1',
                title: 'Map the business',
                desc: 'Set up environments for each function. Connect existing tools. See the real state of operations for the first time — scattered, overlapping, invisible.',
                color: 'var(--text-3)',
              },
              {
                week: 'Week 2',
                title: 'Build the first workflow',
                desc: 'Pick the highest-friction process. Build a multi-stage workflow. Run it with Nova. Watch what the AI produces — and learn what to adjust.',
                color: 'var(--text-2)',
              },
              {
                week: 'Week 4',
                title: 'See the pattern',
                desc: 'Health scores show which systems need attention. Workflow execution time is dropping. The team starts designing workflows instead of doing manual ops.',
                color: '#7193ED',
              },
              {
                week: 'Week 8',
                title: 'The compound effect',
                desc: 'AI remembers the brand, the voice, the preferences. Workflows run faster. Signals get triaged automatically. The team focuses on decisions, not tasks.',
                color: '#15AD70',
              },
            ].map(item => (
              <div key={item.week} className="glass-deep p-6 rounded-2xl flex gap-6">
                <div className="flex-shrink-0 w-16 text-right">
                  <p className="text-[10px] tracking-[0.15em] uppercase" style={{ color: item.color }}>{item.week}</p>
                </div>
                <div>
                  <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-deep p-6 rounded-2xl mt-6 text-center">
            <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
              Not a faster workspace. A system that teaches you how to run better work.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHO THIS IS FOR ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--text-3)' }}>
            Built For
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-6">
            Teams that want to understand, not just execute
          </h2>
          <p className="text-sm font-light leading-relaxed mb-12 max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
            GRID is for founders, operators, and small teams who want AI that works inside their business — not beside it. People who care about getting better at running work, not just getting more done.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { who: 'Founders', desc: 'See the whole business in one place. Build systems that run without you.', color: '#15AD70' },
              { who: 'Operators', desc: 'Design workflows that improve themselves. Measure what actually changed.', color: '#7193ED' },
              { who: 'Small teams', desc: 'Do the work of a larger team — and learn how to do it even better.', color: '#BF9FF1' },
            ].map(item => (
              <div key={item.who} className="glass-deep p-6 rounded-2xl">
                <div className="w-2 h-2 rounded-full mx-auto mb-3" style={{ background: item.color }} />
                <p className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>{item.who}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE LINE ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--text-3)' }}>The Thesis</p>
          <h2 className="text-3xl font-extralight tracking-tight leading-snug mb-8">
            AI doesn&apos;t replace how you work.<br />
            <span style={{ color: 'var(--brand)' }}>It teaches you how to work better.</span>
          </h2>
          <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
            Most tools optimize for speed. GRID optimizes for understanding. When teams see how their business actually operates — when AI and humans learn in parallel — the result isn&apos;t just efficiency. It&apos;s mastery.
          </p>
        </div>
      </section>

      {/* ═══ WAITLIST CTA ═══ */}
      <section id="waitlist" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
            Early Access
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-4">
            Learn the system. Improve the system.
          </h2>
          <p className="text-sm font-light mb-10" style={{ color: 'var(--text-2)' }}>
            We&apos;re opening access to a small group of teams who want to see how AI changes their work. Drop your email and we&apos;ll reach out when your workspace is ready.
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
            <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={e => { if (e.key === 'Enter') handleWaitlist(); }}
                className="glass-input w-full sm:flex-1 px-5 py-3.5 text-sm"
              />
              <button
                onClick={handleWaitlist}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-light rounded-xl transition-all flex-shrink-0"
                style={{ background: 'var(--brand)', color: '#000', fontWeight: 400, opacity: submitting ? 0.5 : 1 }}>
                {submitting ? 'Joining...' : 'Request access'}
              </button>
              {error && (
                <p className="text-xs mt-2 w-full text-center" style={{ color: 'var(--danger)' }}>{error}</p>
              )}
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
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[10px] transition-colors hover:text-white/60" style={{ color: 'var(--text-3)', opacity: 0.5 }}>Privacy</Link>
            <Link href="/terms" className="text-[10px] transition-colors hover:text-white/60" style={{ color: 'var(--text-3)', opacity: 0.5 }}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
