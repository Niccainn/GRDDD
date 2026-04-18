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

import { useState, useRef, useCallback } from 'react';
import type { ScaffoldSpec } from '@/lib/scaffold/spec';

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

export default function LiveScaffoldWidget({ environmentId, onCommitted, className }: Props) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'drafting' | 'review' | 'committing' | 'done' | 'error'>('idle');
  const [organelles, setOrganelles] = useState<Organelle[]>([]);
  const [spec, setSpec] = useState<ScaffoldSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setOrganelles([]);
    setSpec(null);
    setError(null);
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

      {/* Prompt input — visible while idle or after error */}
      {(status === 'idle' || status === 'error') && (
        <>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='e.g. "6-person creative studio doing brand identity + packaging. Marco runs content, Lea runs production ops."'
            rows={3}
            className="w-full text-sm font-light px-3 py-2.5 rounded-xl focus:outline-none resize-none"
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
            disabled={prompt.trim().length < 10}
            className="w-full mt-3 py-2.5 text-sm font-light rounded-full transition-all disabled:opacity-40"
            style={{
              background: 'var(--brand-soft)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
            }}
          >
            Build this cell →
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
