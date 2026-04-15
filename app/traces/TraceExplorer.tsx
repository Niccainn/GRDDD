'use client';

import { useState, useMemo } from 'react';
import type { TraceEvent } from '@/lib/kernel';

// Minimal shape we read from the API — intentionally not importing the
// full TraceRecord type so the client bundle stays small.
interface TraceSummary {
  traceId: string;
  tenantId: string;
  actorId: string;
  surface: string;
  environmentId?: string;
  systemId?: string;
  tier: string;
  model: string;
  startedAt: string | Date;
  durationMs: number;
  status: 'running' | 'done' | 'error';
  errorMessage?: string;
  events: TraceEvent[];
  response?: {
    text: string;
    tokens: { input: number; output: number; total: number };
    costUsd: number;
    toolCalls: number;
  };
}

export default function TraceExplorer({
  initialTraces,
}: {
  initialTraces: TraceSummary[];
}) {
  const [selected, setSelected] = useState<TraceSummary | null>(
    initialTraces[0] ?? null
  );
  const [filter, setFilter] = useState<'all' | 'chat' | 'workflow' | 'error'>(
    'all'
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return initialTraces;
    if (filter === 'error') return initialTraces.filter((t) => t.status === 'error');
    return initialTraces.filter((t) => t.surface === filter);
  }, [initialTraces, filter]);

  if (!initialTraces.length) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-white/50 font-light">
          No traces yet. Ask Nova a question and come back — every run will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* ─── Left: trace list ─────────────────────────────────────── */}
      <aside className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/5 p-3 flex gap-1 flex-wrap">
          {(['all', 'chat', 'workflow', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase transition-colors ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.traceId}
              onClick={() => setSelected(t)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                selected?.traceId === t.traceId ? 'bg-white/5' : 'hover:bg-white/[0.03]'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-[0.1em] text-white/40">
                  {t.surface}
                </span>
                <StatusDot status={t.status} />
              </div>
              <p className="text-[11px] font-light text-white/80 truncate">
                {t.response?.text?.slice(0, 80) || t.errorMessage || '(running)'}
              </p>
              <p className="text-[9px] text-white/30 mt-1">
                {t.model} · {t.durationMs}ms ·{' '}
                {t.response ? `$${t.response.costUsd.toFixed(4)}` : '—'}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* ─── Right: trace detail ──────────────────────────────────── */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 min-h-[70vh]">
        {selected ? <TraceDetail trace={selected} /> : null}
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: TraceSummary['status'] }) {
  const color =
    status === 'done' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-amber-400';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function TraceDetail({ trace }: { trace: TraceSummary }) {
  const tokens = trace.response?.tokens.total ?? 0;
  const cost = trace.response?.costUsd ?? 0;
  const toolCalls = trace.response?.toolCalls ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <StatusDot status={trace.status} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {trace.surface} · {trace.tier}
          </span>
        </div>
        <h2 className="text-lg font-light mb-1">{trace.model}</h2>
        <p className="text-xs text-white/40 font-light">
          Trace {trace.traceId.slice(0, 8)} · started{' '}
          {new Date(trace.startedAt).toLocaleString()}
        </p>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <Metric label="Duration" value={`${trace.durationMs}ms`} />
        <Metric label="Tokens" value={tokens.toLocaleString()} />
        <Metric label="Cost" value={`$${cost.toFixed(4)}`} />
        <Metric label="Tools" value={String(toolCalls)} />
      </div>

      {trace.errorMessage && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-red-300/70 mb-1">
            Error
          </p>
          <p className="text-xs font-mono text-red-200/90">{trace.errorMessage}</p>
        </div>
      )}

      {/* Event timeline */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">
          Event stream
        </p>
        <div className="space-y-2">
          {trace.events.map((evt, i) => (
            <EventRow key={i} event={evt} />
          ))}
        </div>
      </div>

      {/* Final response */}
      {trace.response?.text && (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">
            Final response
          </p>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <pre className="text-xs font-light text-white/85 whitespace-pre-wrap leading-relaxed">
              {trace.response.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[9px] uppercase tracking-[0.15em] text-white/40 mb-1">{label}</p>
      <p className="text-sm font-light text-white">{value}</p>
    </div>
  );
}

function EventRow({ event }: { event: TraceEvent }) {
  const color =
    event.type === 'error'
      ? 'border-red-500/20 bg-red-500/5'
      : event.type === 'tool_call' || event.type === 'tool_result'
      ? 'border-purple-500/20 bg-purple-500/5'
      : event.type === 'done'
      ? 'border-emerald-500/20 bg-emerald-500/5'
      : 'border-white/5 bg-white/[0.02]';

  return (
    <div className={`rounded-lg border ${color} px-3 py-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/50">
            {event.type}
          </p>
          <p className="text-xs text-white/80 font-light mt-0.5 break-words">
            {renderEventBody(event)}
          </p>
        </div>
        <span className="text-[9px] text-white/30 font-mono shrink-0">
          {new Date(event.timestamp).toISOString().slice(11, 23)}
        </span>
      </div>
    </div>
  );
}

function renderEventBody(event: TraceEvent): string {
  switch (event.type) {
    case 'start':
      return `${event.model} (${event.tier})`;
    case 'thinking':
      return 'model turn';
    case 'reasoning':
      return event.text.slice(0, 200);
    case 'tool_call':
      return `${event.toolName}(${JSON.stringify(event.args).slice(0, 140)})`;
    case 'tool_result':
      return `${event.ok ? '✓' : '✗'} ${event.summary} (${event.durationMs}ms)`;
    case 'text_delta':
      return event.text.slice(0, 200);
    case 'warning':
      return `${event.code}: ${event.message}`;
    case 'done':
      return `complete · ${event.response.tokens.total} tok · $${event.response.costUsd.toFixed(4)}`;
    case 'error':
      return event.message;
    default:
      return '';
  }
}
