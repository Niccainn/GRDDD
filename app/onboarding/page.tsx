'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOnboarding } from '@/lib/use-onboarding';

// ── Step data ───────────────────────────────────────────────────────

const WORK_TYPES = [
  {
    id: 'agency',
    label: 'Agency / Studio',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'startup',
    label: 'Startup / Product team',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'freelancer',
    label: 'Freelancer / Solo',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'enterprise',
    label: 'Enterprise / Corporate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 6h2M9 10h2M9 14h2M13 6h2M13 10h2M13 14h2M8 18h8" strokeLinecap="round" />
      </svg>
    ),
  },
];

const ENV_TYPES = ['Marketing', 'Engineering', 'Design', 'Operations', 'Custom'];

const ENV_PLACEHOLDERS: Record<string, string> = {
  Marketing: 'e.g. Brand & Growth',
  Engineering: 'e.g. Product Engineering',
  Design: 'e.g. Design Studio',
  Operations: 'e.g. Ops Central',
  Custom: 'e.g. My Workspace',
};

const INTEGRATIONS = [
  {
    id: 'slack',
    name: 'Slack',
    color: '#E01E5A',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
      </svg>
    ),
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    color: '#4285F4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 2v4M15 2v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    color: '#FFFFFF',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    id: 'notion',
    name: 'Notion',
    color: '#FFFFFF',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.15c-.42-.326-.98-.7-2.055-.607L3.01 2.71c-.467.047-.56.28-.374.466l1.823 1.033zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.354c0-.607-.233-.934-.747-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.607.327-1.167.514-1.634.514-.747 0-.934-.234-1.494-.934l-4.577-7.186v6.952l1.447.327s0 .84-1.167.84l-3.22.187c-.093-.187 0-.653.327-.747l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.454-.234 4.763 7.28v-6.44l-1.213-.14c-.094-.514.28-.887.747-.933l3.22-.187z" />
      </svg>
    ),
  },
];

const TOTAL_STEPS = 5;

// ── Component ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { markComplete, setProfile } = useOnboarding();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workType, setWorkType] = useState('');
  const [envName, setEnvName] = useState('');
  const [envType, setEnvType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const envNameRef = useRef<HTMLInputElement>(null);

  // Pre-fill name from auth
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  // Focus inputs when step changes
  useEffect(() => {
    if (step === 1) setTimeout(() => nameRef.current?.focus(), 400);
    if (step === 2) setTimeout(() => envNameRef.current?.focus(), 400);
  }, [step]);

  // Auto-suggest env name based on work type and env type
  useEffect(() => {
    if (envType && !envName) {
      const suggestions: Record<string, string> = {
        Marketing: 'Brand & Growth',
        Engineering: 'Product Engineering',
        Design: 'Design Studio',
        Operations: 'Ops Central',
        Custom: 'My Workspace',
      };
      setEnvName(suggestions[envType] || '');
    }
  }, [envType, envName]);

  const goTo = useCallback((target: number) => {
    if (animating || target === step) return;
    setDirection(target > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 250);
  }, [step, animating]);

  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
  }, [step, goTo]);

  const back = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't advance if submitting or on the final step
        if (submitting) return;
        if (step === 2 && !envType) return;
        if (step === TOTAL_STEPS - 1) return;
        e.preventDefault();
        // On step 2, submit the environment
        if (step === 2) {
          handleCreateEnvironment();
          return;
        }
        next();
      }
      if (e.key === 'Escape' && step > 0) {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  async function handleCreateEnvironment() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          role: role || undefined,
          workType: workType || undefined,
          environmentName: envName || undefined,
          environmentType: envType || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      await res.json();

      setProfile({
        name,
        role,
        workType,
        environmentName: envName,
        environmentType: envType,
      });

      next();
    } catch {
      // Allow retry
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinish() {
    markComplete();
    router.push('/dashboard');
  }

  // ── Animation class ─────────────────────────────────────────────
  const slideClass = animating
    ? direction === 'forward'
      ? 'onboard-slide-out-left'
      : 'onboard-slide-out-right'
    : direction === 'forward'
      ? 'onboard-slide-in-right'
      : 'onboard-slide-in-left';

  // ── Progress bar ────────────────────────────────────────────────
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <>
      {/* Full-screen overlay to cover the sidebar */}
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'var(--bg, #08080C)' }}>
        {/* Ambient background effect */}
        <div className="onboard-ambient" />

        {/* Progress bar */}
        <div className="relative z-10 h-0.5 w-full" style={{ background: 'var(--glass-border)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, rgba(113,147,237,0.6), rgba(191,159,241,0.6))',
            }}
          />
        </div>

        {/* Step content */}
        <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">
          <div className={`w-full max-w-lg px-6 ${slideClass}`}>

            {/* ── Step 0: Welcome ──────────────────────────────── */}
            {step === 0 && (
              <div className="text-center">
                <div className="onboard-fade-in">
                  <div className="mb-8 flex justify-center">
                    <svg width="48" height="60" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.2 }}>
                      <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
                      <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
                      <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-light tracking-tight mb-3" style={{ color: 'var(--text-1)' }}>
                    Welcome to GRID
                  </h1>
                  <p className="text-sm font-light mb-10" style={{ color: 'var(--text-3)' }}>
                    Your AI-powered workspace OS
                  </p>
                  <button
                    onClick={next}
                    className="onboard-btn-primary"
                  >
                    Get started
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: Profile Setup ────────────────────────── */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-light tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
                  Set up your profile
                </h2>
                <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
                  Tell us a little about yourself.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-xs font-light mb-1.5 block" style={{ color: 'var(--text-3)' }}>Name</label>
                    <input
                      ref={nameRef}
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="onboard-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-light mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                      Role / Title
                      <span className="ml-1" style={{ color: 'var(--text-3)', opacity: 0.5 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      placeholder="e.g. Founder, Marketing Lead, Engineer"
                      className="onboard-input"
                    />
                  </div>
                </div>

                <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
                  What best describes your work?
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {WORK_TYPES.map(wt => (
                    <button
                      key={wt.id}
                      onClick={() => setWorkType(wt.id)}
                      className="onboard-card group"
                      style={{
                        borderColor: workType === wt.id ? 'rgba(191,159,241,0.5)' : undefined,
                        background: workType === wt.id ? 'rgba(191,159,241,0.06)' : undefined,
                      }}
                    >
                      <span style={{ color: workType === wt.id ? 'rgba(191,159,241,0.8)' : 'var(--text-3)' }}>
                        {wt.icon}
                      </span>
                      <span
                        className="text-xs font-light"
                        style={{ color: workType === wt.id ? 'var(--text-1)' : 'var(--text-2)' }}
                      >
                        {wt.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={back} className="onboard-btn-ghost">Back</button>
                  <button onClick={next} className="onboard-btn-primary">Continue</button>
                </div>
              </div>
            )}

            {/* ── Step 2: Create Environment ───────────────────── */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-light tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
                  Create your first environment
                </h2>
                <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
                  Nova will help set up your workspace based on this.
                </p>

                <div className="mb-6">
                  <label className="text-xs font-light mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                    What type of work?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ENV_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          setEnvType(t);
                          // Clear envName so auto-suggest re-fires
                          if (envType !== t) setEnvName('');
                        }}
                        className="text-xs font-light px-4 py-2 rounded-full transition-all"
                        style={{
                          background: envType === t ? 'rgba(191,159,241,0.1)' : 'var(--glass)',
                          border: `1px solid ${envType === t ? 'rgba(191,159,241,0.4)' : 'var(--glass-border)'}`,
                          color: envType === t ? 'rgba(191,159,241,0.9)' : 'var(--text-3)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="text-xs font-light mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                    Environment name
                  </label>
                  <input
                    ref={envNameRef}
                    type="text"
                    value={envName}
                    onChange={e => setEnvName(e.target.value)}
                    placeholder={ENV_PLACEHOLDERS[envType] || 'Name your workspace'}
                    className="onboard-input"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={back} className="onboard-btn-ghost">Back</button>
                  <button
                    onClick={handleCreateEnvironment}
                    disabled={!envType || submitting}
                    className="onboard-btn-primary"
                    style={{ opacity: !envType ? 0.4 : 1 }}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
                        Creating...
                      </span>
                    ) : (
                      'Create environment'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Integrations (optional) ──────────────── */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-light tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
                  Connect your tools
                </h2>
                <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
                  Optional -- you can always connect these later.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {INTEGRATIONS.map(int => (
                    <button
                      key={int.id}
                      onClick={() => router.push('/integrations')}
                      className="onboard-card group"
                    >
                      <span style={{ color: int.color, opacity: 0.7 }}>{int.icon}</span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                        {int.name}
                      </span>
                      <span className="text-[10px] font-light mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                        Connect
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={back} className="onboard-btn-ghost">Back</button>
                  <div className="flex items-center gap-3">
                    <button onClick={next} className="onboard-btn-ghost">Skip for now</button>
                    <button onClick={next} className="onboard-btn-primary">Continue</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Ready! ───────────────────────────────── */}
            {step === 4 && (
              <div className="text-center">
                <div className="onboard-fade-in">
                  {/* Success animation */}
                  <div className="relative mb-8 flex justify-center">
                    <div className="onboard-success-ring" />
                    <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.3)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15AD70" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" className="onboard-check-draw" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-light tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
                    Your workspace is ready
                  </h2>
                  <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
                    Here is what we set up for you:
                  </p>

                  {/* Summary */}
                  <div className="glass-deep px-6 py-5 mb-8 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Environment</span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>{envName || 'My Workspace'}</span>
                    </div>
                    <div className="h-px" style={{ background: 'var(--glass-border)' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>System</span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>Getting Started</span>
                    </div>
                    <div className="h-px" style={{ background: 'var(--glass-border)' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Workflow</span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>Getting Started</span>
                    </div>
                    {workType && (
                      <>
                        <div className="h-px" style={{ background: 'var(--glass-border)' }} />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Work type</span>
                          <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
                            {WORK_TYPES.find(w => w.id === workType)?.label || workType}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={handleFinish} className="onboard-btn-primary">
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="relative z-10 flex justify-center gap-2 pb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                width: i === step ? 24 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step
                  ? 'rgba(191,159,241,0.6)'
                  : i < step
                    ? 'rgba(191,159,241,0.25)'
                    : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Scoped styles for onboarding */}
      <style jsx global>{`
        /* Ambient gradient background */
        .onboard-ambient {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .onboard-ambient::before {
          content: '';
          position: absolute;
          top: -40%;
          left: -20%;
          width: 80%;
          height: 80%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(113,147,237,0.06) 0%, transparent 70%);
          animation: onboard-drift 20s ease-in-out infinite;
        }
        .onboard-ambient::after {
          content: '';
          position: absolute;
          bottom: -30%;
          right: -10%;
          width: 60%;
          height: 60%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(191,159,241,0.05) 0%, transparent 70%);
          animation: onboard-drift 25s ease-in-out infinite reverse;
        }

        @keyframes onboard-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(5%, 3%) scale(1.05); }
          66% { transform: translate(-3%, -5%) scale(0.97); }
        }

        /* Fade in */
        .onboard-fade-in {
          animation: onboard-fadein 0.6s ease-out both;
        }
        @keyframes onboard-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Slide transitions */
        .onboard-slide-in-right {
          animation: onboard-slide-in-r 0.35s ease-out both;
        }
        .onboard-slide-in-left {
          animation: onboard-slide-in-l 0.35s ease-out both;
        }
        .onboard-slide-out-left {
          animation: onboard-slide-out-l 0.25s ease-in both;
        }
        .onboard-slide-out-right {
          animation: onboard-slide-out-r 0.25s ease-in both;
        }

        @keyframes onboard-slide-in-r {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-slide-in-l {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-slide-out-l {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes onboard-slide-out-r {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }

        /* Success ring animation */
        .onboard-success-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 1px solid rgba(21,173,112,0.3);
          animation: onboard-ring-expand 1.2s ease-out both;
        }
        @keyframes onboard-ring-expand {
          0% { width: 40px; height: 40px; opacity: 0; }
          50% { opacity: 1; }
          100% { width: 120px; height: 120px; opacity: 0; }
        }

        /* Checkmark draw animation */
        .onboard-check-draw {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: onboard-draw 0.5s ease-out 0.3s forwards;
        }
        @keyframes onboard-draw {
          to { stroke-dashoffset: 0; }
        }

        /* Input style */
        .onboard-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 300;
          color: var(--text-1);
          background: var(--glass);
          border: 1px solid var(--glass-border);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .onboard-input::placeholder {
          color: var(--text-3);
          opacity: 0.5;
        }
        .onboard-input:focus {
          border-color: rgba(191,159,241,0.4);
          box-shadow: 0 0 0 3px rgba(191,159,241,0.08);
        }

        /* Card style */
        .onboard-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 16px;
          border-radius: 16px;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          transition: all 0.2s;
          cursor: pointer;
        }
        .onboard-card:hover {
          border-color: rgba(191,159,241,0.3);
          background: rgba(191,159,241,0.04);
        }

        /* Buttons */
        .onboard-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 28px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 300;
          color: white;
          background: linear-gradient(135deg, rgba(113,147,237,0.3), rgba(191,159,241,0.3));
          border: 1px solid rgba(191,159,241,0.3);
          cursor: pointer;
          transition: all 0.2s;
        }
        .onboard-btn-primary:hover {
          background: linear-gradient(135deg, rgba(113,147,237,0.4), rgba(191,159,241,0.4));
          border-color: rgba(191,159,241,0.5);
          box-shadow: 0 0 20px rgba(191,159,241,0.1);
        }
        .onboard-btn-primary:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .onboard-btn-ghost {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-3);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .onboard-btn-ghost:hover {
          color: var(--text-2);
          background: var(--glass);
          border-color: var(--glass-border);
        }
      `}</style>
    </>
  );
}
