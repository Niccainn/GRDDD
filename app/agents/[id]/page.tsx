'use client';

/**
 * /agents/[id] — the detail view.
 *
 * Three panels:
 *   1. Header — name, emoji, status, last-run, delete
 *   2. Prompt — the editable prompt template. Save writes a PATCH,
 *      nothing re-runs automatically. This is where iteration lives.
 *   3. Runs — history list. The most recent run is expanded with its
 *      structured output blocks, each editable in place.
 *
 * "Run now" fires the sync execution route; when it returns we prepend
 * the new run to the history and expand it.
 */

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Block = {
  id: string;
  index: number;
  type: string;
  content: Record<string, unknown>;
  editedAt: string | null;
  editedById: string | null;
};

type Run = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  resolvedPrompt: string;
  inputs: Record<string, unknown> | null;
  outputText: string | null;
  tokens: number | null;
  cost: number | null;
  error: string | null;
  blocks: Block[];
};

type AgentDetail = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  promptTemplate: string;
  inputsSchema: unknown[];
  model: string | null;
  schedule: string;
  status: string;
  lastRunAt: string | null;
  createdAt: string;
  environment: { id: string; name: string; color: string | null };
  runs: Run[];
};

/**
 * Map AgentRunError codes to user-actionable copy. Anything we don't
 * know about falls through to a generic "see details" hint so the raw
 * error message stays the source of truth.
 */
function friendlyErrorHint(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case 'missing_key':
      return 'Connect an Anthropic API key in Settings → AI to run agents.';
    case 'budget_exceeded':
      return 'This environment is out of token budget for the period. Raise the budget in Settings.';
    case 'awaiting_approval':
      return 'Some pending actions still need a decision before this run can resume.';
    case 'invalid_state':
      return 'The run is in a state that does not allow this operation. Reload the page.';
    case 'execution_failed':
      return 'The upstream tool or model call threw an error. The run was marked failed.';
    default:
      return null;
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runErrorCode, setRunErrorCode] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data: AgentDetail) => {
        setAgent(data);
        setPromptDraft(data.promptTemplate);
        if (data.runs.length > 0) setExpandedRun(data.runs[0].id);
      });
  }, [id]);

  async function savePrompt() {
    if (!agent || !promptDirty) return;
    setSavingPrompt(true);
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptTemplate: promptDraft }),
    });
    if (res.ok) {
      setAgent({ ...agent, promptTemplate: promptDraft });
      setPromptDirty(false);
    }
    setSavingPrompt(false);
  }

  async function runAgent() {
    if (!agent) return;
    setRunning(true);
    setRunError(null);
    setRunErrorCode(null);
    setRunStatus('Starting…');

    try {
      const res = await fetch(`/api/agents/${id}/run/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: {} }),
      });

      if (!res.ok) {
        const err = await res.json();
        setRunError(err.error ?? 'Run failed');
        setRunErrorCode(typeof err.code === 'string' ? err.code : null);
        setRunning(false);
        setRunStatus(null);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setRunError('No response stream');
        setRunning(false);
        setRunStatus(null);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(eventType, data);
            } catch { /* skip malformed */ }
            eventType = '';
          }
        }
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Stream failed');
    }

    setRunning(false);
    setRunStatus(null);
  }

  function handleStreamEvent(event: string, data: Record<string, unknown>) {
    if (!agent) return;

    switch (event) {
      case 'iteration:start':
        setRunStatus(`Thinking… (turn ${data.iteration}/${data.maxIterations})`);
        break;
      case 'tool:calling':
        setRunStatus(`Calling ${data.toolName}…`);
        break;
      case 'tool:result':
        if (data.error) {
          setRunStatus(`${data.toolName} failed — continuing…`);
        } else {
          setRunStatus(`${data.toolName} done (${data.durationMs}ms)`);
        }
        break;
      case 'action:pending':
        setRunStatus(`Approval needed: ${data.summary}`);
        break;
      case 'text:done':
        setRunStatus('Finalizing…');
        break;
      case 'run:done': {
        // Reload the full run from the server so we get proper block ids.
        const runId = data.id as string;
        fetch(`/api/agents/${id}`)
          .then(r => r.json())
          .then((fresh: AgentDetail) => {
            setAgent(fresh);
            setExpandedRun(runId);
          });
        break;
      }
      case 'run:error':
        setRunError(String(data.error ?? 'Run failed'));
        setRunErrorCode(typeof data.code === 'string' ? data.code : null);
        break;
    }
  }

  async function deleteAgent() {
    if (!agent) return;
    if (!confirm(`Delete "${agent.name}"? This can't be undone from the UI.`)) return;
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    router.push('/agents');
  }

  async function saveBlockEdit(
    runId: string,
    blockId: string,
    newContent: Record<string, unknown>,
  ) {
    await fetch(`/api/agents/${id}/runs/${runId}/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    });
    // Local state update so the edit reflects immediately.
    if (!agent) return;
    setAgent({
      ...agent,
      runs: agent.runs.map((r) =>
        r.id !== runId
          ? r
          : {
              ...r,
              blocks: r.blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : { ...b, content: newContent, editedAt: new Date().toISOString() },
              ),
            },
      ),
    });
  }

  async function decidePendingAction(
    runId: string,
    actionId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(
      `/api/agents/${id}/runs/${runId}/actions/${actionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error ?? 'Decision failed' };
    }
    // The route returns the full run shape with refreshed blocks —
    // splice it into local state so approve/reject UI updates plus
    // any downstream resume output appears immediately.
    const updatedRun: Run = await res.json();
    if (!agent) return { ok: true };
    setAgent({
      ...agent,
      runs: agent.runs.map((r) => (r.id === runId ? updatedRun : r)),
    });
    return { ok: true };
  }

  if (!agent) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-4xl">
        <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-4xl">
      <Link
        href="/agents"
        className="text-xs font-light mb-6 inline-flex items-center gap-1.5"
        style={{ color: 'var(--text-3)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M6 2L3 5l3 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {agent.emoji ?? '◆'}
          </div>
          <div>
            <h1 className="text-2xl font-extralight tracking-tight mb-0.5">{agent.name}</h1>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
              <span>{agent.environment.name}</span>
              <span>·</span>
              <span>{agent.model ?? 'claude-sonnet-4-6'}</span>
              <span>·</span>
              <span>Last ran {timeAgo(agent.lastRunAt)}</span>
            </div>
            {agent.description && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>
                {agent.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAgent}
            disabled={running}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'rgba(200,242,107,0.12)',
              border: '1px solid rgba(200,242,107,0.3)',
              color: '#C8F26B',
            }}
          >
            {running ? (runStatus ?? 'Running…') : '▶  Run now'}
          </button>
          <button
            onClick={deleteAgent}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {runError && (
        <div
          className="mb-6 p-4 rounded-xl text-xs"
          style={{
            background: 'rgba(220,60,60,0.08)',
            border: '1px solid rgba(220,60,60,0.25)',
            color: '#dc6b6b',
          }}
        >
          <p>{runError}</p>
          {friendlyErrorHint(runErrorCode) && (
            <p className="mt-1 opacity-75">{friendlyErrorHint(runErrorCode)}</p>
          )}
        </div>
      )}

      {/* Prompt editor */}
      <div
        className="p-5 rounded-xl mb-6"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            PROMPT
          </p>
          {promptDirty && (
            <button
              onClick={savePrompt}
              disabled={savingPrompt}
              className="text-xs font-light px-3 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: 'rgba(200,242,107,0.1)',
                border: '1px solid rgba(200,242,107,0.25)',
                color: '#C8F26B',
              }}
            >
              {savingPrompt ? 'Saving…' : 'Save prompt'}
            </button>
          )}
        </div>
        <textarea
          value={promptDraft}
          onChange={(e) => {
            setPromptDraft(e.target.value);
            setPromptDirty(e.target.value !== agent.promptTemplate);
          }}
          rows={Math.min(16, Math.max(6, promptDraft.split('\n').length + 1))}
          className="w-full text-sm font-light px-3 py-3 rounded-lg focus:outline-none font-mono"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--glass-border)',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.6,
          }}
        />
        <StructuredOutputHint />
      </div>

      {/* Schedule picker */}
      <SchedulePicker
        value={agent.schedule}
        onChange={async (schedule) => {
          const res = await fetch(`/api/agents/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule }),
          });
          if (res.ok) setAgent({ ...agent, schedule });
        }}
      />

      {/* Runs */}
      <div className="mb-3">
        <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
          RUNS ({agent.runs.length})
        </p>
      </div>

      {agent.runs.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            No runs yet. Hit <span style={{ color: '#C8F26B' }}>Run now</span> to fire the first
            one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agent.runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              expanded={expandedRun === run.id}
              onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
              onBlockEdit={(blockId, content) => saveBlockEdit(run.id, blockId, content)}
              onActionDecision={(actionId, decision, reason) =>
                decidePendingAction(run.id, actionId, decision, reason)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Run card with expandable blocks ────────────────────────────────────────

function RunCard({
  run,
  expanded,
  onToggle,
  onBlockEdit,
  onActionDecision,
}: {
  run: Run;
  expanded: boolean;
  onToggle: () => void;
  onBlockEdit: (blockId: string, content: Record<string, unknown>) => void | Promise<void>;
  onActionDecision: (
    actionId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const statusColor =
    run.status === 'SUCCESS'
      ? '#C8F26B'
      : run.status === 'FAILED'
        ? '#dc6b6b'
        : run.status === 'AWAITING_APPROVAL'
          ? '#F59E0B'
          : run.status === 'RUNNING'
            ? 'rgba(255,255,255,0.6)'
            : 'var(--text-3)';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
        style={{ background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor }}
          />
          <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
            {new Date(run.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-xs" style={{ color: statusColor }}>
            {run.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
          {run.tokens != null && <span className="tabular-nums">{run.tokens.toLocaleString()} tok</span>}
          {run.cost != null && <span className="tabular-nums">${run.cost.toFixed(4)}</span>}
          <span>{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div
          className="px-5 py-4 space-y-3"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          {run.error && (
            <div
              className="rounded-lg p-3"
              style={{
                background: 'rgba(220,60,60,0.06)',
                border: '1px solid rgba(220,60,60,0.2)',
              }}
            >
              <p className="text-xs" style={{ color: '#dc6b6b' }}>
                {run.error}
              </p>
            </div>
          )}
          {run.blocks.length === 0 && !run.error && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              No output blocks.
            </p>
          )}
          {run.blocks.map((block) => (
            <BlockView
              key={block.id}
              block={block}
              onSave={(content) => onBlockEdit(block.id, content)}
              onActionDecision={onActionDecision}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Schedule picker ───────────────────────────────────────────────────────

const SCHEDULE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'manual', label: 'Manual', hint: 'Run on demand only' },
  { value: 'every_15m', label: 'Every 15 min', hint: 'High-frequency polling' },
  { value: 'every_hour', label: 'Hourly', hint: 'Every 60 minutes' },
  { value: 'every_4h', label: 'Every 4 hours', hint: '6 runs per day' },
  { value: 'daily', label: 'Daily', hint: 'Once every 24 hours' },
  { value: 'weekly', label: 'Weekly', hint: 'Once every 7 days' },
];

function SchedulePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (schedule: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const current = SCHEDULE_OPTIONS.find((o) => o.value === value) ?? SCHEDULE_OPTIONS[0];

  async function handleChange(newValue: string) {
    if (newValue === value) return;
    setSaving(true);
    await onChange(newValue);
    setSaving(false);
  }

  return (
    <div
      className="p-4 rounded-xl mb-6 flex items-center justify-between"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div>
        <p className="text-xs tracking-[0.1em] mb-1" style={{ color: 'var(--text-3)' }}>
          SCHEDULE
        </p>
        <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
          {current.hint}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {saving && (
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            Saving…
          </span>
        )}
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="text-xs font-light px-3 py-2 rounded-lg focus:outline-none appearance-none cursor-pointer disabled:opacity-40"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--glass-border)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {SCHEDULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#111' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Structured-output hint (collapsible) ──────────────────────────────────

function StructuredOutputHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[10px] tracking-[0.18em] transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        {open ? '▾' : '▸'} STRUCTURED OUTPUT FORMAT
      </button>
      {open && (
        <div
          className="mt-2 p-3 rounded-lg text-[11px] font-light leading-relaxed"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: 'var(--text-3)',
          }}
        >
          <p className="mb-2">
            Paste any of these markers into your prompt to make the model emit typed blocks
            the dashboard can render and edit in place:
          </p>
          <pre
            className="font-mono text-[10px] whitespace-pre-wrap"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
{`::tldr:: One-line summary of the whole run.

::heading[1]:: Section title
::heading[2]:: Subsection

::metric[label=CAC, value=$42.10, delta=+12%, hint=vs 7-day avg]::
::metric[label=CTR, value=1.8%, delta=-0.3%]::

::table::
| Campaign | Spend | CTR  |
| -------- | ----- | ---- |
| A        | $120  | 2.1% |
| B        | $340  | 0.8% |
::end::

Anything outside markers becomes a regular text block.`}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Editable block — dispatches to a typed renderer ───────────────────────
//
// Each block type has its own display + editor so users can e.g. edit
// a metric's value as a single input instead of a JSON blob. Unknown
// types fall through to a raw-JSON editor so future block types still
// work without breaking the history.

function BlockView({
  block,
  onSave,
  onActionDecision,
}: {
  block: Block;
  onSave: (content: Record<string, unknown>) => void | Promise<void>;
  onActionDecision: (
    actionId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const editedBadge = block.editedAt ? (
    <span
      className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded tracking-wider"
      style={{
        background: 'rgba(200,242,107,0.08)',
        color: '#C8F26B',
      }}
    >
      EDITED
    </span>
  ) : null;

  switch (block.type) {
    case 'tldr':
      return <TldrBlock block={block} onSave={onSave} badge={editedBadge} />;
    case 'heading':
      return <HeadingBlock block={block} onSave={onSave} badge={editedBadge} />;
    case 'metric':
      return <MetricBlock block={block} onSave={onSave} badge={editedBadge} />;
    case 'table':
      return <TableBlock block={block} onSave={onSave} badge={editedBadge} />;
    case 'action':
      return <ActionBlock block={block} onActionDecision={onActionDecision} />;
    case 'text':
    default:
      return <TextBlock block={block} onSave={onSave} badge={editedBadge} />;
  }
}

// ─── Action block — Phase 5 write-gate approval card ───────────────
//
// Rendered for `action` blocks emitted when an agent run pauses on a
// mutating tool call. Shows the human-readable summary the tool's
// summarize() helper produced, plus approve/reject buttons that POST
// to /api/agents/[id]/runs/[runId]/actions/[actionId]. Once decided
// the card collapses to a status pill so the run history stays
// auditable.

function ActionBlock({
  block,
  onActionDecision,
}: {
  block: Block;
  onActionDecision: (
    actionId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const c = block.content as {
    pendingActionId?: string;
    toolName?: string;
    provider?: string;
    summary?: string;
    status?: string;
  };
  const actionId = String(c.pendingActionId ?? '');
  const status = String(c.status ?? 'PENDING');
  const summary = String(c.summary ?? '');
  const toolName = String(c.toolName ?? '');
  const provider = String(c.provider ?? '');

  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  async function handleApprove() {
    setError(null);
    setSubmitting('approve');
    const result = await onActionDecision(actionId, 'approve');
    if (!result.ok) setError(result.error ?? 'Approval failed');
    setSubmitting(null);
  }

  async function handleReject() {
    setError(null);
    setSubmitting('reject');
    const result = await onActionDecision(actionId, 'reject', reason || undefined);
    if (!result.ok) setError(result.error ?? 'Rejection failed');
    setSubmitting(null);
  }

  const isPending = status === 'PENDING';
  const statusColor =
    status === 'EXECUTED' || status === 'APPROVED'
      ? '#C8F26B'
      : status === 'REJECTED' || status === 'FAILED'
        ? '#dc6b6b'
        : '#F59E0B';

  return (
    <div
      className="rounded-lg p-4 relative"
      style={{
        background: isPending
          ? 'rgba(245, 158, 11, 0.06)'
          : 'rgba(0,0,0,0.15)',
        border: `1px solid ${
          isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.05)'
        }`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] tracking-[0.18em]"
            style={{ color: statusColor }}
          >
            {isPending ? 'PROPOSED ACTION' : status}
          </span>
          {provider && (
            <span
              className="text-[10px] tracking-wider px-2 py-0.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-3)',
              }}
            >
              {provider}
            </span>
          )}
        </div>
      </div>

      <p
        className="text-sm font-light leading-snug mb-1"
        style={{ color: 'rgba(255,255,255,0.95)' }}
      >
        {summary || toolName || '(no summary)'}
      </p>
      {summary && toolName && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
          {toolName}
        </p>
      )}

      {isPending && (
        <div className="mt-3">
          {showReject ? (
            <div className="space-y-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional, helps the agent recover)"
                autoFocus
                className="w-full text-xs font-light px-3 py-2 rounded focus:outline-none"
                style={inputStyle}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  disabled={submitting !== null}
                  className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(220,60,60,0.1)',
                    border: '1px solid rgba(220,60,60,0.3)',
                    color: '#dc6b6b',
                  }}
                >
                  {submitting === 'reject' ? 'Rejecting…' : 'Confirm reject'}
                </button>
                <button
                  onClick={() => {
                    setShowReject(false);
                    setReason('');
                  }}
                  className="text-xs font-light"
                  style={{ color: 'var(--text-3)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={submitting !== null}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(200,242,107,0.12)',
                  border: '1px solid rgba(200,242,107,0.3)',
                  color: '#C8F26B',
                }}
              >
                {submitting === 'approve' ? 'Approving…' : 'Approve & run'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={submitting !== null}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-3)',
                }}
              >
                Reject
              </button>
            </div>
          )}
          {error && (
            <p className="text-[11px] mt-2" style={{ color: '#dc6b6b' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Per-type components ───────────────────────────────────────────────────

type BlockProps = {
  block: Block;
  onSave: (content: Record<string, unknown>) => void | Promise<void>;
  badge: React.ReactNode;
};

function EditWrapper({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      className="rounded-lg p-4 cursor-text relative transition-all hover:border-white/10"
      style={{
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function EditorShell({
  onSave,
  onCancel,
  saving,
  children,
}: {
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(200,242,107,0.3)',
      }}
    >
      {children}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs font-light px-3 py-1 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'rgba(200,242,107,0.1)',
            border: '1px solid rgba(200,242,107,0.25)',
            color: '#C8F26B',
          }}
        >
          {saving ? 'Saving…' : 'Save edit'}
        </button>
        <button onClick={onCancel} className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--glass-border)',
  color: 'rgba(255,255,255,0.9)',
};

function TextBlock({ block, onSave, badge }: BlockProps) {
  const initial =
    typeof (block.content as { markdown?: string }).markdown === 'string'
      ? (block.content as { markdown: string }).markdown
      : JSON.stringify(block.content, null, 2);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ markdown: draft });
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <EditorShell
        onSave={handleSave}
        onCancel={() => {
          setDraft(initial);
          setEditing(false);
        }}
        saving={saving}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(4, draft.split('\n').length + 1)}
          autoFocus
          className="w-full text-sm font-light p-2 rounded focus:outline-none font-mono"
          style={{ ...inputStyle, lineHeight: 1.6 }}
        />
      </EditorShell>
    );
  }

  return (
    <EditWrapper onClick={() => setEditing(true)}>
      <pre
        className="text-sm font-light whitespace-pre-wrap break-words"
        style={{
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.6,
          fontFamily: 'inherit',
          margin: 0,
        }}
      >
        {initial}
      </pre>
      {badge}
    </EditWrapper>
  );
}

function TldrBlock({ block, onSave, badge }: BlockProps) {
  const initial = String((block.content as { text?: string }).text ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ text: draft });
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <EditorShell
        onSave={handleSave}
        onCancel={() => {
          setDraft(initial);
          setEditing(false);
        }}
        saving={saving}
      >
        <p className="text-[10px] tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
          TL;DR
        </p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          className="w-full text-base font-light px-3 py-2 rounded focus:outline-none"
          style={inputStyle}
        />
      </EditorShell>
    );
  }

  return (
    <EditWrapper onClick={() => setEditing(true)}>
      <p className="text-[10px] tracking-[0.18em] mb-1.5" style={{ color: 'var(--nova)' }}>
        TL;DR
      </p>
      <p className="text-base font-light leading-snug" style={{ color: 'rgba(255,255,255,0.95)' }}>
        {initial || <span style={{ color: 'var(--text-3)' }}>(empty)</span>}
      </p>
      {badge}
    </EditWrapper>
  );
}

function HeadingBlock({ block, onSave, badge }: BlockProps) {
  const c = block.content as { level?: number; text?: string };
  const initialText = String(c.text ?? '');
  const initialLevel = typeof c.level === 'number' ? c.level : 2;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [level, setLevel] = useState(initialLevel);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ level, text });
    setSaving(false);
    setEditing(false);
  }

  const fontSize = initialLevel === 1 ? '1.5rem' : initialLevel === 2 ? '1.2rem' : '1rem';

  if (editing) {
    return (
      <EditorShell
        onSave={handleSave}
        onCancel={() => {
          setText(initialText);
          setLevel(initialLevel);
          setEditing(false);
        }}
        saving={saving}
      >
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[10px] tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
            HEADING
          </p>
          <select
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10))}
            className="text-xs px-2 py-1 rounded appearance-none"
            style={inputStyle}
          >
            <option value={1} style={{ background: '#111' }}>
              H1
            </option>
            <option value={2} style={{ background: '#111' }}>
              H2
            </option>
            <option value={3} style={{ background: '#111' }}>
              H3
            </option>
          </select>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          className="w-full font-light px-3 py-2 rounded focus:outline-none"
          style={{ ...inputStyle, fontSize }}
        />
      </EditorShell>
    );
  }

  return (
    <EditWrapper onClick={() => setEditing(true)}>
      <p
        className="font-extralight tracking-tight"
        style={{ fontSize, color: 'rgba(255,255,255,0.95)', margin: 0 }}
      >
        {initialText || <span style={{ color: 'var(--text-3)' }}>(empty)</span>}
      </p>
      {badge}
    </EditWrapper>
  );
}

function MetricBlock({ block, onSave, badge }: BlockProps) {
  const c = block.content as {
    label?: string;
    value?: string;
    delta?: string;
    hint?: string;
  };
  const initial = {
    label: String(c.label ?? ''),
    value: String(c.value ?? ''),
    delta: String(c.delta ?? ''),
    hint: String(c.hint ?? ''),
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(draft as unknown as Record<string, unknown>);
    setSaving(false);
    setEditing(false);
  }

  // Color the delta: leading '+' → green, '-' → red, else neutral.
  const deltaColor = initial.delta.startsWith('+')
    ? '#C8F26B'
    : initial.delta.startsWith('-')
      ? '#dc6b6b'
      : 'var(--text-3)';

  if (editing) {
    return (
      <EditorShell
        onSave={handleSave}
        onCancel={() => {
          setDraft(initial);
          setEditing(false);
        }}
        saving={saving}
      >
        <p className="text-[10px] tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
          METRIC
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Label (e.g. CAC)"
            className="w-full text-xs font-light px-3 py-2 rounded focus:outline-none"
            style={inputStyle}
          />
          <input
            value={draft.delta}
            onChange={(e) => setDraft({ ...draft, delta: e.target.value })}
            placeholder="Delta (e.g. +12%)"
            className="w-full text-xs font-light px-3 py-2 rounded focus:outline-none"
            style={inputStyle}
          />
        </div>
        <input
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          autoFocus
          placeholder="Value (e.g. $42.10)"
          className="w-full text-xl font-light px-3 py-2 rounded focus:outline-none mb-2"
          style={inputStyle}
        />
        <input
          value={draft.hint}
          onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
          placeholder="Hint (optional)"
          className="w-full text-xs font-light px-3 py-2 rounded focus:outline-none"
          style={inputStyle}
        />
      </EditorShell>
    );
  }

  return (
    <EditWrapper onClick={() => setEditing(true)}>
      <p className="text-[10px] tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
        {initial.label || 'METRIC'}
      </p>
      <div className="flex items-baseline gap-3">
        <p
          className="font-extralight tabular-nums"
          style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}
        >
          {initial.value || '—'}
        </p>
        {initial.delta && (
          <span className="text-xs font-light tabular-nums" style={{ color: deltaColor }}>
            {initial.delta}
          </span>
        )}
      </div>
      {initial.hint && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
          {initial.hint}
        </p>
      )}
      {badge}
    </EditWrapper>
  );
}

function TableBlock({ block, onSave, badge }: BlockProps) {
  const c = block.content as { headers?: string[]; rows?: string[][] };
  const initial = {
    headers: Array.isArray(c.headers) ? c.headers.map(String) : [],
    rows: Array.isArray(c.rows) ? c.rows.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [],
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(draft as unknown as Record<string, unknown>);
    setSaving(false);
    setEditing(false);
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    setDraft((prev) => {
      const rows = prev.rows.map((r) => [...r]);
      rows[rowIdx][colIdx] = value;
      return { ...prev, rows };
    });
  }

  function updateHeader(colIdx: number, value: string) {
    setDraft((prev) => {
      const headers = [...prev.headers];
      headers[colIdx] = value;
      return { ...prev, headers };
    });
  }

  if (editing) {
    return (
      <EditorShell
        onSave={handleSave}
        onCancel={() => {
          setDraft(initial);
          setEditing(false);
        }}
        saving={saving}
      >
        <p className="text-[10px] tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
          TABLE
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {draft.headers.map((h, i) => (
                  <th key={i} className="p-1">
                    <input
                      value={h}
                      onChange={(e) => updateHeader(i, e.target.value)}
                      className="w-full text-xs font-medium px-2 py-1 rounded focus:outline-none"
                      style={inputStyle}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-1">
                      <input
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-full text-xs font-light px-2 py-1 rounded focus:outline-none"
                        style={inputStyle}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditorShell>
    );
  }

  return (
    <EditWrapper onClick={() => setEditing(true)}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              {initial.headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left font-light py-2 px-2 tracking-wider text-[10px] uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initial.rows.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  borderBottom:
                    ri < initial.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="py-2 px-2 font-light tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {badge}
    </EditWrapper>
  );
}
