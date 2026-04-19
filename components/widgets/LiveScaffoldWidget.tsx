'use client';

/**
 * LiveScaffoldWidget — the cell assembly visualiser.
 *
 * One prompt in, organelle-by-organelle stream out, accept or reject
 * the whole draft. Subscribes to /api/environments/scaffold as SSE.
 *
 * Parent passes a known environmentId (the workspace that gets built
 * out from the prompt). This widget does NOT create the environment
 * — the welcome wizard already does that.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { ScaffoldSpec } from '@/lib/scaffold/spec';
import AutonomyBadge from '@/components/AutonomyBadge';

type Organelle = {
  kind: 'system' | 'workflow' | 'signal' | 'widget' | 'role' | 'integration';
  name: string;
};

type Props = {
  environmentId: string;
  onCommitted?: (result: {
    systemsCreated: number;
    workflowsCreated: number;
    signalsCreated: number;
  }) => void;
  className?: string;
};

const KIND_LABEL: Record<Organelle['kind'], string> = {
  system: 'System',
  workflow: 'Workflow',
  signal: 'Signal',
  widget: 'Widget',
  role: 'Role',
  integration: 'Integration',
};

const KIND_COLOR: Record<Organelle['kind'], string> = {
  system: '#15AD70',
  workflow: '#BF9FF1',
  signal: '#F7C700',
  widget: '#7193ED',
  role: '#4ECDC4',
  integration: '#FF6B6B',
};

type CriticState = {
  status: 'started' | 'applied' | 'skipped' | 'failed';
  note?: string;
};

export default function LiveScaffoldWidget({ environmentId, onCommitted, className }: Props) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'drafting' | 'review' | 'committing' | 'done' | 'error'>('idle');
  const [organelles, setOrganelles] = useState<Organelle[]>([]);
  const [spec, setSpec] = useState<ScaffoldSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [critic, setCritic] = useState<CriticState | null>(null);
  // BYOK precondition. Scaffold calls Nova, which calls Anthropic —
  // without a key the API just returns an error we can't recover
  // from. Pre-flight the check so new users see a helpful CTA
  // instead of hitting an unhelpful 400 after they've typed a prompt.
  const [keyStatus, setKeyStatus] = useState<'checking' | 'missing' | 'connected'>('checking');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/settings/anthropic-key?environmentId=${environmentId}`)
      .then(r => r.ok ? r.json() : { connected: false })
      .then(d => {
        if (cancelled) return;
        setKeyStatus(d.connected ? 'connected' : 'missing');
      })
      .catch(() => { if (!cancelled) setKeyStatus('missing'); });
    return () => { cancelled = true; };
  }, [environmentId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setOrganelles([]);
    setSpec(null);
    setError(null);
    setCritic(null);
  }, []);

  const draft = useCallback(async () => {
    if (prompt.trim().length < 10) {
      setError('Give me a sentence or two — at least 10 characters.');
      return;
    }
    setOrganelles([]);
    setSpec(null);
    setError(null);
    setStatus('drafting');

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`/api/environments/scaffold?environmentId=${environmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const msg = (await res.json().catch(() => ({}))).error ?? 'Scaffold failed';
        setError(msg);
        setStatus('error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'organelle') {
              setOrganelles(prev => [...prev, { kind: evt.kind, name: evt.name }]);
            } else if (evt.type === 'critic') {
              setCritic({ status: evt.status, note: evt.note });
            } else if (evt.type === 'validated') {
              setSpec(evt.spec);
              setStatus('review');
            } else if (evt.type === 'error') {
              setError(evt.message);
              setStatus('error');
            }
          } catch {
            /* skip malformed event */
          }
        }
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Connection lost');
      setStatus('error');
    }
  }, [prompt, environmentId]);

  const commit = useCallback(async () => {
    if (!spec) return;
    setStatus('committing');
    try {
      const res = await fetch(`/api/environments/scaffold?environmentId=${environmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Commit failed');
        setStatus('error');
        return;
      }
      setStatus('done');
      onCommitted?.({
        systemsCreated: data.systemsCreated,
        workflowsCreated: data.workflowsCreated,
        signalsCreated: data.signalsCreated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
      setStatus('error');
    }
  }, [spec, environmentId, onCommitted]);

  return (
    <div
      className={`rounded-2xl p-5 ${className ?? ''}`}
      style={{
        background: 'var(--glass)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
            Scaffold
          </p>
          <h3 className="text-sm font-light mt-1" style={{ color: 'var(--text-1)' }}>
            Describe your team. Nova builds the cell.
          </h3>
        </div>
        {status !== 'idle' && status !== 'drafting' && (
          <button
            onClick={reset}
            className="text-xs font-light"
            style={{ color: 'var(--text-3)' }}
          >
            Start over
          </button>
        )}
      </div>

      {/* BYOK gate — shown on idle/error when no Anthropic key is
          connected. Without this the user types a prompt, clicks
          Build, and gets a 400 "no key" with no recovery path. */}
      {(status === 'idle' || status === 'error') && keyStatus === 'missing' && (
        <div
          className="rounded-xl p-4 text-xs font-light"
          style={{
            background: 'rgba(247,199,0,0.06)',
            border: '1px solid rgba(247,199,0,0.2)',
            color: 'var(--text-2)',
          }}
        >
          <p className="mb-3">
            Scaffolding uses Nova, which needs your Anthropic API key.
            Connect yours to keep requests on your own billing — GRID
            never sees it in plaintext.
          </p>
          <Link
            href="/settings/ai"
            className="inline-block px-3 py-1.5 rounded-full text-xs font-light transition-all"
            style={{
              background: 'rgba(247,199,0,0.12)',
              border: '1px solid rgba(247,199,0,0.3)',
              color: '#F7C700',
            }}
          >
            Connect Anthropic key →
          </Link>
        </div>
      )}

      {/* Prompt input — visible while idle or after error, gated on a
          connected key so we never let the user type into a dead end. */}
      {(status === 'idle' || status === 'error') && keyStatus !== 'missing' && (
        <>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='e.g. "6-person creative studio doing brand identity + packaging. Marco runs content, Lea runs production ops."'
            rows={3}
            disabled={keyStatus === 'checking'}
            className="w-full text-sm font-light px-3 py-2.5 rounded-xl focus:outline-none resize-none disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          />
          {error && (
            <p className="text-xs mt-2" style={{ color: '#FF6B6B' }}>
              {error}
            </p>
          )}
          <button
            onClick={draft}
            disabled={prompt.trim().length < 10 || keyStatus === 'checking'}
            className="w-full mt-3 py-2.5 text-sm font-light rounded-full transition-all disabled:opacity-40"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
            }}
          >
            {keyStatus === 'checking' ? 'Checking…' : 'Build this cell →'}
          </button>
        </>
      )}

      {/* Live assembly — organelles stream in */}
      {status === 'drafting' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--brand)' }}
            />
            <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
              Nova is assembling…
            </p>
          </div>
          <div className="space-y-1 max-h-[260px] overflow-y-auto">
            {organelles.map((o, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-light animate-fade-in"
                style={{ background: `${KIND_COLOR[o.kind]}0e` }}
              >
                <span style={{ color: KIND_COLOR[o.kind], opacity: 0.9 }}>✓</span>
                <span style={{ color: 'var(--text-3)' }}>{KIND_LABEL[o.kind]}</span>
                <span style={{ color: 'var(--text-1)' }}>{o.name}</span>
              </div>
            ))}
            {organelles.length === 0 && (
              <p className="text-xs font-light italic" style={{ color: 'var(--text-3)' }}>
                Thinking about the shape of the cell…
              </p>
            )}
          </div>
        </div>
      )}

      {/* Review — spec returned, awaiting commit */}
      {status === 'review' && spec && (
        <div className="space-y-3">
          <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
            {spec.summary}
          </p>

          {/* Critic-pass visibility — show what self-iteration did, even when
              it silently succeeded or failed. Users forgive explained
              outcomes; they lose trust on silence. */}
          {critic && (
            <div
              className="flex items-start gap-2 rounded-lg p-2.5 text-[11px] font-light"
              style={{
                background:
                  critic.status === 'failed'
                    ? 'rgba(255,107,107,0.06)'
                    : critic.status === 'applied'
                    ? 'rgba(21,173,112,0.06)'
                    : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  critic.status === 'failed'
                    ? 'rgba(255,107,107,0.2)'
                    : critic.status === 'applied'
                    ? 'rgba(21,173,112,0.18)'
                    : 'var(--glass-border)'
                }`,
                color: 'var(--text-2)',
              }}
            >
              <span
                style={{
                  color:
                    critic.status === 'failed'
                      ? '#FF6B6B'
                      : critic.status === 'applied'
                      ? 'var(--brand)'
                      : 'var(--text-3)',
                }}
              >
                {critic.status === 'applied' ? '↺' : critic.status === 'failed' ? '!' : '·'}
              </span>
              <span>
                {critic.note ??
                  (critic.status === 'started'
                    ? 'Nova is reviewing its own draft…'
                    : critic.status === 'applied'
                    ? 'Critic applied a revision.'
                    : critic.status === 'skipped'
                    ? 'Critic kept the original draft.'
                    : 'Critic failed — keeping the original draft.')}
              </span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Systems" count={spec.systems.length} color={KIND_COLOR.system} />
            <Stat label="Workflows" count={spec.workflows.length} color={KIND_COLOR.workflow} />
            <Stat label="Signals" count={spec.signals.length} color={KIND_COLOR.signal} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Widgets" count={spec.widgets.length} color={KIND_COLOR.widget} />
            <Stat label="Roles" count={spec.roles.length} color={KIND_COLOR.role} />
            <Stat label="Integrations" count={spec.integrations.length} color={KIND_COLOR.integration} />
          </div>

          {/* Proposed per-system agents — visible autonomy tiers so the
              user can see exactly what each one will be allowed to do. */}
          {spec.systems.some(s => s.agent) && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'rgba(191,159,241,0.04)', border: '1px solid rgba(191,159,241,0.12)' }}
            >
              <p
                className="text-[10px] tracking-[0.16em] uppercase font-light"
                style={{ color: 'var(--text-3)' }}
              >
                Agents Nova proposes
              </p>
              {spec.systems
                .filter(s => s.agent)
                .map(s => (
                  <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-light" style={{ color: 'var(--text-1)' }}>
                      {s.agent!.name}
                    </span>
                    <AutonomyBadge
                      tier={s.agent!.autonomyTier ?? 'Suggest'}
                      phrasing="natural"
                    />
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={reset}
              className="flex-1 py-2 text-xs font-light rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-2)',
              }}
            >
              Reject
            </button>
            <button
              onClick={commit}
              className="flex-1 py-2 text-xs font-light rounded-full"
              style={{
                background: 'var(--brand)',
                color: '#000',
              }}
            >
              Commit scaffold
            </button>
          </div>
        </div>
      )}

      {status === 'committing' && (
        <p className="text-xs font-light text-center py-4" style={{ color: 'var(--text-2)' }}>
          Persisting cell…
        </p>
      )}

      {status === 'done' && (
        <div className="text-center py-3">
          <p className="text-sm font-light mb-1" style={{ color: 'var(--brand)' }}>
            ✓ Cell built
          </p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Refresh the dashboard to see the new systems.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="rounded-lg p-2"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
    >
      <p className="text-lg font-extralight" style={{ color }}>
        {count}
      </p>
      <p className="text-[10px] tracking-[0.1em] uppercase" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
    </div>
  );
}
