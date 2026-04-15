'use client';
/**
 * /welcome — post-signup onboarding wizard.
 *
 * Three steps, each in its own local state. The whole thing lives
 * on one page so back-forward navigation inside the wizard is
 * instant and doesn't roundtrip the server between steps.
 *
 * Steps:
 *   1. You — name (prefilled) + role
 *   2. Workspace — workspace name
 *   3. Template — solo / team / blank
 *
 * On final submit we POST everything to /api/onboarding/complete and
 * push the user into /dashboard. The API stamps Identity.onboardedAt
 * so the middleware stops redirecting back here.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import { useAuth } from '@/components/AuthProvider';

type Template = 'solo' | 'team' | 'blank';

const TEMPLATES: Array<{
  id: Template;
  title: string;
  description: string;
  accent: string;
  icon: ReactElement;
}> = [
  {
    id: 'solo',
    title: 'Solo builder',
    description: 'Just you. Starter systems for capture, triage, and weekly review.',
    accent: '#15AD70',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'team',
    title: 'Small team',
    description: 'Up to 5 seats. Shared goals, signals, and automated handoffs.',
    accent: '#7193ED',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3.5" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c0-3 2.8-5.5 6-5.5s6 2.5 6 5.5M13.5 20c.3-2 2-3.5 3.5-3.5s3.2 1.5 3.5 3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'blank',
    title: 'Start blank',
    description: 'Empty workspace. Build your own systems from scratch.',
    accent: '#BF9FF1',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [brandAudience, setBrandAudience] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [template, setTemplate] = useState<Template>('solo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill name from the auth context once it resolves. Guarded so
  // the user can overwrite it without us clobbering their input on
  // the next provider re-render.
  useEffect(() => {
    if (user && !name) setName(user.name || '');
  }, [user, name]);

  // Not signed in — bounce to sign-in. Happens if someone hits
  // /welcome directly without a session (middleware would normally
  // block this, but defense in depth).
  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in?next=/welcome');
  }, [authLoading, user, router]);

  async function finish() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, workspaceName, template, brandTone, brandAudience, brandValues }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }
      // Signal the dashboard to show the first-time welcome experience
      try { localStorage.setItem('grid:just-onboarded', 'true'); } catch {}
      router.push('/dashboard');
    } catch {
      setError('Connection error');
      setSubmitting(false);
    }
  }

  const canStep1 = name.trim().length >= 1;
  const canStep2 = workspaceName.trim().length >= 1;
  const stepTitles: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
    1: { title: "Let's get you set up", subtitle: 'Takes about 30 seconds.' },
    2: { title: 'Name your workspace', subtitle: 'You can rename it later.' },
    3: { title: 'Define your brand voice', subtitle: 'Nova will stay on-brand in everything it creates. Optional — you can set this up later.' },
    4: { title: 'Pick a starting point', subtitle: 'Choose the closest fit. You can switch anytime.' },
  };
  const s = stepTitles[step];

  return (
    <AuthLayout title={s.title} subtitle={s.subtitle}>
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-[3px] rounded-full transition-all duration-500"
            style={{
              width: step === i ? 28 : 14,
              background: i <= step ? 'var(--brand)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="Your name"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              What do you do? <span style={{ color: 'var(--text-3)', opacity: 0.6 }}>(optional)</span>
            </label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="Founder, designer, PM…"
            />
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canStep1}
            className="w-full py-[13px] text-sm font-light rounded-full transition-all mt-2"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
              opacity: canStep1 ? 1 : 0.4,
            }}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="workspace" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              Workspace name
            </label>
            <input
              id="workspace"
              type="text"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="Acme, Studio Nine, etc."
              autoFocus
            />
            <p className="text-[11px] mt-2 font-light" style={{ color: 'var(--text-3)' }}>
              This is the name of your private instance of GRID.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-2)',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canStep2}
              className="flex-1 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
                opacity: canStep2 ? 1 : 0.4,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="brandTone" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              How should your brand sound?
            </label>
            <input
              id="brandTone"
              type="text"
              value={brandTone}
              onChange={e => setBrandTone(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="e.g. Professional but warm, confident, approachable"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="brandAudience" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              Who is your audience?
            </label>
            <input
              id="brandAudience"
              type="text"
              value={brandAudience}
              onChange={e => setBrandAudience(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="e.g. Health-conscious millennials, 25-40, urban professionals"
            />
          </div>
          <div>
            <label htmlFor="brandValues" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
              What does your brand stand for?
            </label>
            <input
              id="brandValues"
              type="text"
              value={brandValues}
              onChange={e => setBrandValues(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="e.g. Transparency, sustainability, innovation"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-2)',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
              }}
            >
              {brandTone || brandAudience || brandValues ? 'Continue' : 'Skip for now'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {TEMPLATES.map(t => {
              const selected = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className="w-full text-left p-4 rounded-2xl transition-all"
                  style={{
                    background: selected ? 'rgba(21,173,112,0.06)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${selected ? 'var(--brand-border)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${t.accent}14`,
                        color: t.accent,
                        border: `1px solid ${t.accent}26`,
                      }}
                    >
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-light" style={{ color: 'var(--text-1)' }}>
                          {t.title}
                        </h3>
                        {selected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[11px] font-light mt-1 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                        {t.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-xs px-3 py-2.5 rounded-lg font-light" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-2)',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={submitting}
              className="flex-1 py-[13px] text-sm font-light rounded-full transition-all"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              {submitting ? 'Creating workspace…' : 'Enter GRID'}
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
