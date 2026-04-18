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
import ImportWizard from '@/components/ImportWizard';

type Template = 'solo' | 'team' | 'blank';

// Must mirror the seed data in app/api/onboarding/complete/route.ts so
// the preview chips in the wizard accurately reflect what gets created.
const TEMPLATES: Array<{
  id: Template;
  title: string;
  description: string;
  accent: string;
  icon: ReactElement;
  preview: { name: string; color: string }[];
  previewLabel: string;
}> = [
  {
    id: 'solo',
    title: 'Solo builder',
    description: 'Just you. Three starter systems, each with a draft workflow ready to edit.',
    accent: '#15AD70',
    preview: [
      { name: 'Marketing', color: '#7193ED' },
      { name: 'Operations', color: '#15AD70' },
      { name: 'Product', color: '#BF9FF1' },
    ],
    previewLabel: '3 systems · 3 draft workflows',
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
    description: 'Up to 5 seats. Five systems covering the full org, plus draft workflows.',
    accent: '#7193ED',
    preview: [
      { name: 'Marketing', color: '#7193ED' },
      { name: 'Sales', color: '#F7C700' },
      { name: 'Operations', color: '#15AD70' },
      { name: 'Product', color: '#BF9FF1' },
      { name: 'Support', color: '#FF6B6B' },
    ],
    previewLabel: '5 systems · 5 draft workflows',
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
    preview: [],
    previewLabel: 'Nothing pre-created',
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
  const [step, setStep] = useState<1 | 2 | 'pathway' | 3 | 4 | 'import'>(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [brandAudience, setBrandAudience] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [template, setTemplate] = useState<Template>('solo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdEnvironmentId, setCreatedEnvironmentId] = useState<string | null>(null);

  // Prefill name from the auth context once it resolves. Guarded so
  // the user can overwrite it without us clobbering their input on
  // the next provider re-render.
  useEffect(() => {
    if (user && !name) setName(user.name || '');
  }, [user, name]);

  // Not signed in — bounce to sign-in. Already onboarded — bounce
  // to dashboard (handles the case where the onboarded cookie was
  // lost but the user already completed onboarding).
  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in?next=/welcome');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/auth/me').then(r => r.json()).then(data => {
        if (data?.identity?.onboardedAt) router.replace('/dashboard');
      }).catch(() => {});
    }
  }, [user, router]);

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
      // Track funnel event and signal dashboard
      try {
        localStorage.setItem('grid:just-onboarded', 'true');
        const { trackEvent } = await import('@/lib/analytics');
        trackEvent('funnel.onboarding_completed', { template });
      } catch {}
      router.push('/dashboard');
    } catch {
      setError('Connection error');
      setSubmitting(false);
    }
  }

  const canStep1 = name.trim().length >= 1;
  const canStep2 = workspaceName.trim().length >= 1;
  const stepTitles: Record<string, { title: string; subtitle: string }> = {
    '1': { title: "Let's get you set up", subtitle: 'Takes about 30 seconds.' },
    '2': { title: 'Name your workspace', subtitle: 'You can rename it later.' },
    'pathway': { title: 'How would you like to start?', subtitle: 'You can always import data later.' },
    '3': { title: 'Define your brand voice', subtitle: 'Nova will stay on-brand in everything it creates. Optional — you can set this up later.' },
    '4': { title: 'Pick a starting point', subtitle: 'Choose the closest fit. You can switch anytime.' },
    'import': { title: 'Bring your work', subtitle: 'Import from your existing tools.' },
  };
  const s = stepTitles[String(step)] || stepTitles['1'];

  return (
    <AuthLayout title={s.title} subtitle={s.subtitle}>
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {(() => {
          const stepNum = step === 'pathway' ? 2.5 : step === 'import' ? 2.5 : Number(step);
          return [1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-[3px] rounded-full transition-all duration-500"
              style={{
                width: stepNum === i || (step === 'pathway' && i === 3) || (step === 'import' && i === 3) ? 28 : 14,
                background: i <= stepNum ? 'var(--brand)' : 'rgba(255,255,255,0.12)',
              }}
            />
          ));
        })()}
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
              onClick={() => setStep('pathway')}
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

      {/* ═══ PATHWAY: Start Fresh vs Bring Your Work ═══ */}
      {step === 'pathway' && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-xl font-extralight mb-1">How would you like to start?</h2>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>You can always import data later from Settings</p>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full flex items-center gap-4 p-5 rounded-xl text-left transition-all"
            style={{ background: 'rgba(21,173,112,0.04)', border: '1px solid rgba(21,173,112,0.15)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15AD70" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>Start fresh</p>
              <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                Create new systems from our templates. Best if you&apos;re building from scratch.
              </p>
            </div>
          </button>

          <button
            onClick={async () => {
              // Create the environment first so ImportWizard has an environmentId
              setSubmitting(true);
              try {
                const res = await fetch('/api/onboarding/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, role, workspaceName, template: 'blank', brandTone, brandAudience, brandValues }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || 'Failed'); setSubmitting(false); return; }
                setCreatedEnvironmentId(data.environmentId);
                setStep('import');
              } catch { setError('Connection error'); }
              setSubmitting(false);
            }}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-5 rounded-xl text-left transition-all"
            style={{ background: 'rgba(113,147,237,0.04)', border: '1px solid rgba(113,147,237,0.15)', opacity: submitting ? 0.5 : 1 }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7193ED" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>Bring your work</p>
              <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                Import from Notion, Asana, Monday, or CSV. Pick up where you left off.
              </p>
            </div>
          </button>

          <button onClick={() => setStep(2)} className="w-full py-2 text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Back
          </button>

          {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      )}

      {/* ═══ IMPORT WIZARD ═══ */}
      {step === 'import' && createdEnvironmentId && (
        <ImportWizard
          environmentId={createdEnvironmentId}
          onComplete={() => {
            try { localStorage.setItem('grid:just-onboarded', 'true'); } catch {}
            router.push('/dashboard');
          }}
          onBack={() => setStep('pathway')}
        />
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
                      {/* Concrete preview so "Solo builder" isn't vague */}
                      {t.preview.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          {t.preview.map(sys => (
                            <span key={sys.name}
                              className="inline-flex items-center gap-1.5 text-[10px] font-light px-2 py-0.5 rounded-full"
                              style={{ background: `${sys.color}10`, border: `1px solid ${sys.color}25`, color: sys.color }}>
                              <span className="w-1 h-1 rounded-full" style={{ background: sys.color }} />
                              {sys.name}
                            </span>
                          ))}
                          <span className="text-[10px] font-light ml-0.5" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                            {t.previewLabel}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] font-light mt-2.5" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                          {t.previewLabel}
                        </p>
                      )}
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
