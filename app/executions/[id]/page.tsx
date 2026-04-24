'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type StageOutput = { stage: string; output: string };

type ToolInvocation = {
  id: string;
  toolId: string;
  claudeName: string;
  provider: string;
  input: Record<string, unknown>;
  result: unknown;
  live: boolean;
  reason?: string;
  startedAt: string;
  ms: number;
  error?: string;
};

type ValidationData = {
  score: number;
  issues: string[];
  summary: string | null;
};

type ExecutionData = {
  id: string;
  status: string;
  input: string;
  output: string | null;
  currentStage: number | null;
  createdAt: string;
  completedAt: string | null;
  system: { id: string; name: string; environmentName: string };
  workflow: { id: string; name: string; stages: string[] } | null;
  validation: ValidationData | null;
};

function MD({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-xs font-medium mt-4 mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{line.slice(3)}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="text-sm font-light mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{line.slice(2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5 ml-1">
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5 leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#68D0CA', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [stageOutputs, setStageOutputs] = useState<StageOutput[]>([]);
  const [invocations, setInvocations] = useState<ToolInvocation[]>([]);
  const [streamingStage, setStreamingStage] = useState<{ index: number; stage: string; text: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function exportMarkdown(outputs: StageOutput[], input: string, wfName?: string) {
    const lines: string[] = [];
    if (wfName) lines.push(`# ${wfName}\n`);
    lines.push(`**Input:** ${input}\n`);
    lines.push(`**Date:** ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n`);
    lines.push('---\n');
    for (const s of outputs) {
      lines.push(`## ${s.stage}\n`);
      lines.push(s.output);
      lines.push('\n---\n');
    }
    return lines.join('\n');
  }

  async function copyToClipboard() {
    const text = exportMarkdown(stageOutputs, execution?.input ?? '', execution?.workflow?.name);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMarkdown() {
    const text = exportMarkdown(stageOutputs, execution?.input ?? '', execution?.workflow?.name);
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${execution?.workflow?.name ?? 'execution'}-${execution?.id?.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetch(`/api/executions/${id}`)
      .then(r => r.json())
      .then(data => {
        setExecution(data);
        // Parse existing output if completed
        if (data.output) {
          try {
            const parsed = JSON.parse(data.output);
            // Two shapes in the wild:
            //   - legacy: [{ stage, output }, ...]
            //   - current: { stages: [...], invocations: [...], live }
            if (Array.isArray(parsed)) {
              setStageOutputs(parsed);
            } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.stages)) setStageOutputs(parsed.stages);
              if (Array.isArray(parsed.invocations)) setInvocations(parsed.invocations);
            }
          } catch { /* plain text output */ }
        }
        setLoaded(true);
      });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stageOutputs, streamingStage]);

  async function runWithNova() {
    if (!execution || running) return;
    setRunning(true);
    setStageOutputs([]);
    setStreamingStage(null);

    const res = await fetch('/api/nova/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionId: execution.id,
        workflowId: execution.workflow?.id ?? null,
        systemId: execution.system.id,
        input: execution.input,
        stages: execution.workflow?.stages ?? [],
      }),
    });

    if (!res.ok) { setRunning(false); return; }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'stage_start') {
            setStreamingStage({ index: event.index, stage: event.stage, text: '' });
          } else if (event.type === 'stage_text') {
            setStreamingStage(prev => prev ? { ...prev, text: prev.text + event.text } : null);
          } else if (event.type === 'stage_done') {
            setStageOutputs(prev => [...prev, { stage: event.stage ?? streamingStage?.stage ?? '', output: event.output }]);
            setStreamingStage(null);
          } else if (event.type === 'tool_invocation') {
            setInvocations(prev => [...prev, event.invocation]);
          } else if (event.type === 'done') {
            setTokens(event.tokens);
            setExecution(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
          } else if (event.type === 'error') {
            console.error(event.message);
          }
        } catch { /* skip */ }
      }
    }

    setRunning(false);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const stages = execution?.workflow?.stages ?? [];
  const hasNovaOutput = stageOutputs.length > 0;
  const canRunNova = loaded && execution && !running && !!process.env.NEXT_PUBLIC_HAS_API_KEY !== false;

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6 animate-fade-in">
        <Link href="/executions" className="text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Runs</Link>
        {execution?.workflow && (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.2 }}><path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Link href={`/workflows/${execution.workflow.id}`}
              className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-3)' }}>
              {execution.workflow.name}
            </Link>
          </>
        )}
        {execution && (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.2 }}><path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>Run {execution.id.slice(0, 8)}</span>
          </>
        )}
      </div>

      {!loaded ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : !execution ? (
        <div className="flex flex-col items-center py-24"><p style={{ color: 'var(--text-3)' }}>Execution not found</p></div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: execution.status === 'COMPLETED' ? '#C8F26B' : execution.status === 'RUNNING' ? '#F7C700' : '#FF6B6B' }} />
                <span className="text-xs font-light" style={{ color: execution.status === 'COMPLETED' ? '#C8F26B' : execution.status === 'RUNNING' ? '#F7C700' : '#FF6B6B' }}>
                  {execution.status.toLowerCase()}
                </span>
                <span style={{ color: 'var(--text-3)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(execution.createdAt)}</span>
                {tokens && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>{tokens.toLocaleString()} tokens</span>}
              </div>
              <Link href={`/systems/${execution.system.id}`}
                className="text-xs font-light transition-colors"
                style={{ color: 'var(--text-3)' }}>
                {execution.system.name} · {execution.system.environmentName}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {hasNovaOutput && (
                <>
                  <button onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: copied ? '#C8F26B' : 'rgba(255,255,255,0.4)' }}>
                    {copied ? '✓ Copied' : 'Copy markdown'}
                  </button>
                  <button onClick={downloadMarkdown}
                    className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.4)' }}>
                    ↓ Download
                  </button>
                </>
              )}
              {!hasNovaOutput && !running && (
                <button onClick={runWithNova}
                  className="flex items-center gap-2 text-xs font-light px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.25)', color: '#BF9FF1' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Process with Nova
                </button>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>INPUT</p>
            <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{execution.input}</p>
          </div>

          {/* Stage pipeline (if workflow has stages) */}
          {stages.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {stages.map((stage, idx) => {
                  const isDone = stageOutputs.some(s => s.stage === stage) || (execution.status === 'COMPLETED' && (execution.currentStage ?? 0) > idx);
                  const isActive = streamingStage?.stage === stage;
                  const stageColor = isDone ? '#C8F26B' : isActive ? '#BF9FF1' : 'rgba(255,255,255,0.2)';
                  return (
                    <div key={idx} className="flex items-center">
                      <div className="flex flex-col items-center px-3 py-2.5 rounded-lg min-w-[90px] text-center transition-all"
                        style={{
                          background: isActive ? 'rgba(191,159,241,0.06)' : isDone ? 'rgba(200,242,107,0.06)' : 'var(--glass)',
                          border: `1px solid ${isActive ? 'rgba(191,159,241,0.25)' : isDone ? 'rgba(200,242,107,0.2)' : 'var(--glass-border)'}`,
                        }}>
                        <span className="text-xs mb-1 tabular-nums" style={{ color: stageColor }}>
                          {isDone ? '✓' : isActive ? '···' : String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-light leading-tight" style={{ color: isActive ? '#BF9FF1' : isDone ? '#C8F26B' : 'rgba(255,255,255,0.6)' }}>
                          {stage}
                        </span>
                      </div>
                      {idx < stages.length - 1 && (
                        <div className="w-5 h-px flex-shrink-0"
                          style={{ background: isDone ? 'rgba(200,242,107,0.35)' : 'rgba(255,255,255,0.08)' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nova output */}
          {(hasNovaOutput || streamingStage) && (
            <div className="space-y-4">
              <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
                NOVA OUTPUT {running && <span className="ml-2 animate-pulse">processing···</span>}
              </p>

              {stageOutputs.map((s, i) => (
                <div key={i} className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(200,242,107,0.15)' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(200,242,107,0.05)', borderBottom: '1px solid rgba(200,242,107,0.1)' }}>
                    <span style={{ color: '#C8F26B', fontSize: '11px' }}>✓</span>
                    <span className="text-xs font-light" style={{ color: '#C8F26B' }}>{s.stage}</span>
                  </div>
                  <div className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <MD text={s.output} />
                  </div>
                </div>
              ))}

              {streamingStage && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(191,159,241,0.2)' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(191,159,241,0.06)', borderBottom: '1px solid rgba(191,159,241,0.1)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#BF9FF1' }} />
                    <span className="text-xs font-light" style={{ color: '#BF9FF1' }}>{streamingStage.stage}</span>
                  </div>
                  <div className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <MD text={streamingStage.text} />
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm"
                      style={{ background: '#BF9FF1', verticalAlign: 'middle' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Tool invocations — the actual work Nova did on external
              systems this run. Each card shows whether it fired live
              or was simulated (dry-run or missing integration), the
              inputs Nova decided to use, and the adapter's response.
              This is the trust theater: read/decided/skipped on a page. */}
          {invocations.length > 0 && (
            <div className="space-y-2 mt-6">
              <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
                TOOL INVOCATIONS · <span className="tabular-nums">{invocations.length}</span>
                <span className="ml-2" style={{ color: 'var(--text-3)' }}>
                  ({invocations.filter(i => i.live).length} live · {invocations.filter(i => !i.live).length} simulated)
                </span>
              </p>
              {invocations.map(inv => {
                const live = inv.live;
                const err = Boolean(inv.error);
                const accent = err ? '#FF6B6B' : live ? '#C8F26B' : '#F5D76E';
                const accentSoft = err ? 'rgba(255,107,107,0.08)' : live ? 'rgba(200,242,107,0.06)' : 'rgba(245,215,110,0.06)';
                return (
                  <div key={inv.id} className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${accent}33` }}>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5"
                      style={{ background: accentSoft, borderBottom: `1px solid ${accent}22` }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="text-xs font-light tabular-nums" style={{ color: accent }}>
                          {inv.toolId}
                        </span>
                        <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                          style={{
                            background: live ? 'rgba(200,242,107,0.1)' : 'rgba(245,215,110,0.1)',
                            border: `1px solid ${live ? 'rgba(200,242,107,0.25)' : 'rgba(245,215,110,0.25)'}`,
                            color: live ? '#C8F26B' : '#F5D76E',
                          }}>
                          {err ? 'error' : live ? 'live' : inv.reason === 'not_connected' ? 'dry-run · not connected' : 'dry-run · policy'}
                        </span>
                      </div>
                      <span className="text-[10px] font-light tabular-nums" style={{ color: 'var(--text-3)' }}>
                        {inv.ms}ms
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-xs font-light font-mono" style={{ color: 'var(--text-2)' }}>
                      <div>
                        <span className="text-[10px] tracking-wider uppercase mr-2" style={{ color: 'var(--text-3)' }}>Input</span>
                        <code className="whitespace-pre-wrap break-all">{JSON.stringify(inv.input, null, 2)}</code>
                      </div>
                      <div>
                        <span className="text-[10px] tracking-wider uppercase mr-2" style={{ color: 'var(--text-3)' }}>Result</span>
                        <code className="whitespace-pre-wrap break-all">{JSON.stringify(inv.result, null, 2).slice(0, 1200)}</code>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation score */}
          {execution.validation && !running && (
            <div className="mt-4 p-4 rounded-xl flex items-start gap-4"
              style={{
                background: execution.validation.score >= 0.8
                  ? 'rgba(200,242,107,0.05)'
                  : execution.validation.score >= 0.6
                    ? 'rgba(247,199,0,0.05)'
                    : 'rgba(255,107,107,0.05)',
                border: `1px solid ${execution.validation.score >= 0.8
                  ? 'rgba(200,242,107,0.15)'
                  : execution.validation.score >= 0.6
                    ? 'rgba(247,199,0,0.15)'
                    : 'rgba(255,107,107,0.15)'}`,
              }}>
              <div className="flex-shrink-0">
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Quality score</p>
                <p className="text-2xl font-extralight tabular-nums"
                  style={{ color: execution.validation.score >= 0.8 ? '#C8F26B' : execution.validation.score >= 0.6 ? '#F7C700' : '#FF6B6B' }}>
                  {Math.round(execution.validation.score * 100)}%
                </p>
              </div>
              <div className="flex-1 min-w-0">
                {execution.validation.summary && (
                  <p className="text-xs font-light mb-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {execution.validation.summary}
                  </p>
                )}
                {execution.validation.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {execution.validation.issues.map((issue, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,107,107,0.08)', color: '#FF9090', border: '1px solid rgba(255,107,107,0.15)' }}>
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plain output (non-Nova, non-structured) */}
          {!hasNovaOutput && !streamingStage && execution.output && (
            <div className="p-5 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>OUTPUT</p>
              <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{execution.output}</p>
            </div>
          )}

          {/* Empty — prompt to run */}
          {!hasNovaOutput && !streamingStage && !execution.output && !running && (
            <div className="flex flex-col items-center py-16 rounded-xl"
              style={{ border: '1px dashed rgba(191,159,241,0.2)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>No output yet</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
                Let Nova process this {stages.length > 0 ? `${stages.length}-stage workflow` : 'request'}
              </p>
              <button onClick={runWithNova}
                className="flex items-center gap-2 text-xs font-light px-5 py-2.5 rounded-lg transition-all"
                style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.25)', color: '#BF9FF1' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Process with Nova
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
