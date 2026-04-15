'use client';
/**
 * WorkflowRunner — client component for executing a spec live.
 *
 * Hits the SSE run endpoint and renders per-stage progress in real
 * time. This is the moment in the product where the "Agentic Work OS"
 * story stops being a claim and starts being a visible fact: humans
 * watch the system think, step by step, with costs and trace IDs.
 *
 * Each stage row has four states:
 *   pending   — not yet started (dim)
 *   running   — currently executing (pulsing dot)
 *   success   — completed OK (check)
 *   failed    — errored out (x)
 *   skipped   — upstream dependency failed
 */
import { useState } from 'react';
import type { WorkflowSpec, StageResult, RunResult } from '@/lib/workflows';

type StageView = {
  id: string;
  name: string;
  state: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  output?: string;
  tokens?: number;
  costUsd?: number;
  durationMs?: number;
  error?: string;
};

export default function WorkflowRunner({ spec }: { spec: WorkflowSpec }) {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageView[]>(
    spec.stages.map((s) => ({ id: s.id, name: s.name, state: 'pending' }))
  );
  const [finalRun, setFinalRun] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState('');

  async function handleRun() {
    setRunning(true);
    setFinalRun(null);
    setRunError('');
    setStages(spec.stages.map((s) => ({ id: s.id, name: s.name, state: 'pending' })));

    try {
      const res = await fetch(`/api/workflows/marketplace/${spec.slug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setRunError(data.error ?? 'Run failed');
        setRunning(false);
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
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;
          const event = JSON.parse(match[1]);

          if (event.type === 'stage_start') {
            setStages((prev) =>
              prev.map((s) => (s.id === event.stageId ? { ...s, state: 'running' } : s))
            );
          } else if (event.type === 'stage_end') {
            const r: StageResult = event.result;
            setStages((prev) =>
              prev.map((s) =>
                s.id === r.stageId
                  ? {
                      ...s,
                      state: r.status,
                      output: r.output,
                      tokens: r.tokens,
                      costUsd: r.costUsd,
                      durationMs: r.durationMs,
                      error: r.error,
                    }
                  : s
              )
            );
          } else if (event.type === 'done') {
            setFinalRun(event.run);
          } else if (event.type === 'error') {
            setRunError(event.message);
          }
        }
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="glass-panel p-6">
        <label
          className="block text-xs mb-2 font-light uppercase tracking-wider"
          style={{ color: 'var(--text-3)' }}
        >
          Input
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={spec.inputSchema?.example ?? 'Optional context for this run…'}
          rows={3}
          className="glass-input w-full px-4 py-3 text-sm font-light resize-none"
          disabled={running}
        />
        {spec.inputSchema?.description && (
          <p className="text-[11px] mt-2 font-light" style={{ color: 'var(--text-3)' }}>
            {spec.inputSchema.description}
          </p>
        )}
        <button
          onClick={handleRun}
          disabled={running}
          className="mt-4 px-6 py-2.5 text-sm font-light rounded-full transition-all"
          style={{
            background: 'var(--brand-soft)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
            opacity: running ? 0.5 : 1,
          }}
        >
          {running ? 'Running…' : 'Run workflow'}
        </button>
      </div>

      {runError && (
        <div
          className="text-xs px-4 py-3 rounded-lg"
          style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
        >
          {runError}
        </div>
      )}

      {/* Stages */}
      <div className="space-y-3">
        {stages.map((s, i) => (
          <StageRow key={s.id} index={i} stage={s} />
        ))}
      </div>

      {/* Final totals */}
      {finalRun && (
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
            Run complete · {finalRun.status}
          </p>
          <div className="grid grid-cols-3 gap-4 text-xs font-light" style={{ color: 'var(--text-2)' }}>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tokens</div>
              <div>{finalRun.totalTokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Cost</div>
              <div>${finalRun.totalCostUsd.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Duration</div>
              <div>{(finalRun.totalDurationMs / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StageRow({ index, stage }: { index: number; stage: StageView }) {
  const [expanded, setExpanded] = useState(false);

  const stateColor = {
    pending: '#64748b',
    running: '#60a5fa',
    success: '#4ade80',
    failed: '#f87171',
    skipped: '#64748b',
  }[stage.state];

  const stateIcon = {
    pending: '○',
    running: '◐',
    success: '●',
    failed: '✕',
    skipped: '—',
  }[stage.state];

  return (
    <div
      className="glass-panel p-4 cursor-pointer transition-all"
      onClick={() => stage.output && setExpanded(!expanded)}
      style={{
        opacity: stage.state === 'pending' ? 0.5 : 1,
        borderLeft: `2px solid ${stateColor}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-base w-6 text-center"
          style={{
            color: stateColor,
            animation: stage.state === 'running' ? 'pulse 1.5s ease-in-out infinite' : undefined,
          }}
        >
          {stateIcon}
        </span>
        <span className="text-[10px] font-light w-6" style={{ color: 'var(--text-3)' }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
            {stage.name}
          </div>
          {stage.error && (
            <div className="text-[11px] font-light mt-0.5" style={{ color: 'var(--danger)' }}>
              {stage.error}
            </div>
          )}
        </div>
        {stage.tokens !== undefined && stage.state === 'success' && (
          <div className="text-[10px] font-light flex gap-3" style={{ color: 'var(--text-3)' }}>
            <span>{stage.tokens}tok</span>
            <span>${stage.costUsd?.toFixed(4)}</span>
            <span>{((stage.durationMs ?? 0) / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>

      {expanded && stage.output && (
        <pre
          className="mt-4 p-4 text-[11px] font-mono whitespace-pre-wrap rounded-lg overflow-auto max-h-96"
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--text-2)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
          }}
        >
          {stage.output}
        </pre>
      )}
    </div>
  );
}
