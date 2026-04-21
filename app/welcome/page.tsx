'use client';
/**
 * /welcome — onboarding (Phase 2).
 *
 * Three steps:
 *   1. Wedge picker — "What do you want Grid to run for you?"
 *   2. Connect required integration(s)
 *   3. Nova builds the System live (streamed narration)
 *
 * On success: redirect to /systems/[id] with the populated System.
 * Never redirects to /dashboard — per spec, the user lands on their
 * working system, not an empty home.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { shippedWedges, type Wedge, wedgeById } from './wedges';

type Step = 'wedge' | 'connect' | 'build' | 'done';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const wedges = shippedWedges();

  const [step, setStep] = useState<Step>('wedge');
  const [wedgeId, setWedgeId] = useState<string | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [buildLines, setBuildLines] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Bootstrap the user's default environment so Connect buttons can
  // hit /api/integrations/oauth/[provider]/start?environmentId=…
  useEffect(() => {
    if (!user) return;
    fetch('/api/environments')
      .then(r => r.json())
      .then(list => {
        const envs = Array.isArray(list) ? list : list?.environments ?? [];
        if (envs.length > 0) setEnvironmentId(envs[0].id);
      })
      .catch(() => {});
  }, [user]);

  const wedge = wedgeId ? wedgeById(wedgeId) : undefined;

  useEffect(() => {
    // If user returns from an OAuth redirect with ?wedge=X&step=connect,
    // restore the flow mid-stride. The integration callback appends
    // ?from=onboarding&wedge=<id> per PHASE_2_ONBOARDING.md.
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    const wedgeParam = params.get('wedge');
    if (fromParam === 'onboarding' && wedgeParam) {
      setWedgeId(wedgeParam);
      setStep('connect');
    }
  }, []);

  // Poll integration status while on the connect step.
  useEffect(() => {
    if (step !== 'connect' || !wedge) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/integrations');
        const data = await res.json();
        const ids: string[] = Array.isArray(data)
          ? data.filter((i: { connected?: boolean }) => i.connected).map((i: { id: string }) => i.id)
          : [];
        if (!cancelled) setConnectedIntegrations(ids);
      } catch {
        /* non-fatal; user can still retry */
      }
    };
    check();
    const t = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [step, wedge]);

  const allIntegrationsReady =
    wedge && wedge.integrations.every(i => connectedIntegrations.includes(i));

  function pickWedge(w: Wedge) {
    setWedgeId(w.id);
    setStep(w.integrations.length === 0 ? 'build' : 'connect');
  }

  function startBuild() {
    if (!wedge) return;
    setBuildLines([]);
    setStep('build');
    const es = new EventSource(`/api/onboarding/build-stream?wedge=${wedge.id}`);
    es.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'step') {
          setBuildLines(prev => [...prev, msg.text]);
        } else if (msg.type === 'done') {
          es.close();
          // Mark onboardedAt so middleware stops redirecting back here.
          fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: user?.name ?? '',
              workspaceName: (user?.name ?? 'My') + ' Workspace',
              template: 'blank',
            }),
          }).finally(() => {
            setStep('done');
            setTimeout(() => router.push(`/systems/${msg.systemId}`), 900);
          });
        } else if (msg.type === 'error') {
          setError(msg.message || 'Build failed');
          es.close();
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    es.onerror = () => {
      es.close();
      setError('Connection to build stream lost.');
    };
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="text-center text-sm" style={{ color: 'var(--text-3)' }}>
          Loading…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {step === 'wedge' && <WedgeStep wedges={wedges} onPick={pickWedge} />}

      {step === 'connect' && wedge && (
        <ConnectStep
          wedge={wedge}
          connectedIntegrations={connectedIntegrations}
          environmentId={environmentId}
          onBack={() => setStep('wedge')}
          onContinue={startBuild}
          allReady={!!allIntegrationsReady}
        />
      )}

      {step === 'build' && wedge && (
        <BuildStep lines={buildLines} error={error} wedge={wedge} />
      )}

      {step === 'done' && (
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Taking you to your System…
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 ambient-bg">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}

// ─── Step 1: Wedge picker ────────────────────────────────────────────

function WedgeStep({ wedges, onPick }: { wedges: Wedge[]; onPick: (w: Wedge) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-light mb-2" style={{ color: 'var(--text-1)' }}>
        What do you want Grid to run for you?
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
        Pick a recurring job. Nova will build the System and be ready in minutes.
      </p>

      <div className="space-y-2">
        {wedges.map(w => (
          <button
            key={w.id}
            onClick={() => onPick(w)}
            className="w-full text-left p-4 rounded-xl transition-all"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                {w.title}
              </span>
              <span className="text-[10px] tracking-wide" style={{ color: 'var(--text-3)' }}>
                ~{w.minutes} min
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
              {w.oneLiner}
            </p>
            {w.integrations.length > 0 && (
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                Connects: {w.integrations.join(', ')}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Connect integrations ────────────────────────────────────

function ConnectStep({
  wedge,
  connectedIntegrations,
  environmentId,
  onBack,
  onContinue,
  allReady,
}: {
  wedge: Wedge;
  connectedIntegrations: string[];
  environmentId: string | null;
  onBack: () => void;
  onContinue: () => void;
  allReady: boolean;
}) {
  const returnTo = `/welcome?from=onboarding&wedge=${wedge.id}`;
  return (
    <div>
      <button
        onClick={onBack}
        className="text-xs mb-4"
        style={{ color: 'var(--text-3)' }}
      >
        ← Pick a different wedge
      </button>
      <h1 className="text-2xl font-light mb-2" style={{ color: 'var(--text-1)' }}>
        Connect your tools
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
        {wedge.title} needs access to {wedge.integrations.length === 1 ? 'one service' : 'a few services'}.
        If you prefer not to grant access, pick a different wedge.
      </p>

      <div className="space-y-2 mb-8">
        {wedge.integrations.map(id => {
          const connected = connectedIntegrations.includes(id);
          return (
            <div
              key={id}
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--text-1)' }}>
                {id}
              </span>
              {connected ? (
                <span className="text-xs" style={{ color: 'var(--brand)' }}>
                  ✓ Connected
                </span>
              ) : environmentId ? (
                <a
                  href={`/api/integrations/oauth/${id}/start?environmentId=${environmentId}&redirect=${encodeURIComponent(returnTo)}`}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'var(--brand)',
                    color: '#000',
                  }}
                >
                  Connect
                </a>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Preparing…
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        disabled={!allReady}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all"
        style={{
          background: allReady ? 'var(--brand)' : 'var(--glass)',
          color: allReady ? '#000' : 'var(--text-3)',
          opacity: allReady ? 1 : 0.5,
          cursor: allReady ? 'pointer' : 'not-allowed',
        }}
      >
        Let Nova build it
      </button>
    </div>
  );
}

// ─── Step 3: Nova builds live ────────────────────────────────────────

function BuildStep({ lines, error, wedge }: { lines: string[]; error: string; wedge: Wedge }) {
  return (
    <div>
      <p className="text-xs tracking-[0.15em] mb-2" style={{ color: 'var(--text-3)' }}>
        NOVA IS BUILDING
      </p>
      <h1 className="text-2xl font-light mb-8" style={{ color: 'var(--text-1)' }}>
        {wedge.systemName}
      </h1>
      <div className="space-y-2 font-mono text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2"
            style={{
              color: 'var(--text-2)',
              animation: 'fadeIn 300ms ease',
            }}
          >
            <span style={{ color: 'var(--brand)' }}>✓</span>
            <span>{line}</span>
          </div>
        ))}
        {lines.length < wedge.buildSteps.length && !error && (
          <div className="flex items-start gap-2" style={{ color: 'var(--text-3)' }}>
            <span>…</span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-6 text-sm" style={{ color: '#FF6B6B' }}>
          {error}
        </p>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
