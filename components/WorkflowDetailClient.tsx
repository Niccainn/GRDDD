'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#15AD70',
  DRAFT: 'rgba(255,255,255,0.3)',
  PAUSED: '#F7C700',
  COMPLETED: '#7193ED',
  ARCHIVED: 'rgba(255,255,255,0.15)',
};

type Execution = {
  id: string;
  status: string;
  input: string;
  output: string | null;
  currentStage: number | null;
  createdAt: string;
};

type WorkflowProps = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stages: string[];
  systemId: string;
  systemName: string;
  environmentName: string;
  environmentSlug: string;
  createdAt: string;
  updatedAt: string;
  totalRuns: number;
};

export default function WorkflowDetailClient({
  workflow: initial,
  executions: initialExecutions,
}: {
  workflow: WorkflowProps;
  executions: Execution[];
}) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState(initial);
  const [executions, setExecutions] = useState(initialExecutions);
  const [activeRun, setActiveRun] = useState<Execution | null>(
    initialExecutions.find(e => e.status === 'RUNNING') ?? null
  );
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initial.name);
  const [editDescription, setEditDescription] = useState(initial.description ?? '');
  const [editStages, setEditStages] = useState<string[]>(initial.stages);
  const [newStage, setNewStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runInput, setRunInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [versions, setVersions] = useState<{ id: string; version: number; description: string | null; createdAt: string }[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [savedAsTemplate, setSavedAsTemplate] = useState(false);

  useEffect(() => {
    fetch(`/api/workflows/${initial.id}/versions`)
      .then(r => r.json())
      .then(v => setVersions(Array.isArray(v) ? v : []));
  }, [initial.id]);

  async function handleStatusChange(status: string) {
    await fetch(`/api/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setWorkflow(w => ({ ...w, status }));
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || null, stages: editStages }),
    });
    const updated = await res.json();
    setWorkflow(w => ({ ...w, name: updated.name, description: updated.description, stages: JSON.parse(updated.stages ?? '[]') }));
    setSaving(false);
    setEditing(false);
  }

  async function handleRun(inputText?: string) {
    if (activeRun) return;
    setRunning(true);
    setShowRunModal(false);
    const withStages = workflow.stages.length > 0;
    const res = await fetch('/api/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: workflow.id,
        systemId: workflow.systemId,
        input: inputText?.trim() || `Run: ${workflow.name}`,
        withStages,
      }),
    });
    const exec = await res.json();
    const newExec: Execution = {
      id: exec.id, status: exec.status, input: exec.input,
      output: exec.output, currentStage: exec.currentStage ?? null,
      createdAt: exec.createdAt,
    };
    setExecutions(prev => [newExec, ...prev]);
    if (withStages && exec.status === 'RUNNING') setActiveRun(newExec);
    setRunning(false);
  }

  async function advanceStage(execId: string, nextStage: number) {
    const isComplete = nextStage >= workflow.stages.length;
    const res = await fetch(`/api/executions/${execId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentStage: isComplete ? workflow.stages.length : nextStage,
        status: isComplete ? 'COMPLETED' : 'RUNNING',
        output: isComplete ? `Completed all ${workflow.stages.length} stages` : null,
      }),
    });
    const updated = await res.json();
    const updatedExec: Execution = {
      ...activeRun!,
      currentStage: updated.currentStage,
      status: updated.status,
      output: updated.output,
    };
    setExecutions(prev => prev.map(e => e.id === execId ? updatedExec : e));
    if (isComplete) {
      setActiveRun(null);
      setWorkflow(w => ({ ...w, totalRuns: w.totalRuns }));
    } else {
      setActiveRun(updatedExec);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/workflows/${workflow.id}`, { method: 'DELETE' });
    router.push('/workflows');
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/workflows/${workflow.id}/duplicate`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workflows/${data.id}`);
    }
    setDuplicating(false);
  }

  function addStage() {
    if (!newStage.trim()) return;
    setEditStages(prev => [...prev, newStage.trim()]);
    setNewStage('');
  }

  const statusColor = STATUS_COLOR[workflow.status] ?? 'rgba(255,255,255,0.3)';
  const currentStageIdx = activeRun?.currentStage ?? null;

  return (
    <div className="px-10 py-10 min-h-screen">
      <Link href="/workflows" className="text-xs font-light mb-8 inline-flex items-center gap-1.5 transition-colors"
        style={{ color: 'var(--text-3)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Workflows
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="text-2xl font-extralight tracking-tight bg-transparent border-b focus:outline-none w-full mb-2"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} />
          ) : (
            <h1 className="text-2xl font-extralight tracking-tight mb-1">{workflow.name}</h1>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Link href={`/systems/${workflow.systemId}`} className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-3)' }}>{workflow.systemName}</Link>
            <span style={{ color: 'var(--text-3)' }}>·</span>
            <Link href={`/environments/${workflow.environmentSlug}`} className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-3)' }}>{workflow.environmentName}</Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-6">
          {/* Status */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-xs font-light px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusColor}30`, color: statusColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {workflow.status.toLowerCase()}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-focus-within:block group-hover:block rounded-lg overflow-hidden py-1"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)', minWidth: '130px' }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="w-full text-left px-3 py-1.5 text-xs font-light transition-colors hover:bg-white/5 flex items-center gap-2"
                  style={{ color: STATUS_COLOR[s] ?? 'rgba(255,255,255,0.5)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Run */}
          <button onClick={() => { if (!activeRun && !running) setShowRunModal(true); }}
            disabled={running || !!activeRun}
            className="text-xs font-light px-4 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}>
            {running ? 'Starting···' : activeRun ? 'In progress' : '▶ Run'}
          </button>

          {editing ? (
            <>
              <button onClick={handleSaveEdit} disabled={saving}
                className="text-xs font-light px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                {saving ? 'Saving···' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>Edit</button>
          )}

          <button onClick={handleDuplicate} disabled={duplicating}
            className="text-xs font-light transition-colors disabled:opacity-40"
            style={{ color: 'rgba(255,255,255,0.2)' }}>
            {duplicating ? '···' : 'Duplicate'}
          </button>

          {confirmDelete ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Delete?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,60,60,0.12)', color: '#FF7070', border: '1px solid rgba(255,60,60,0.2)' }}>
                {deleting ? '···' : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>Delete</button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
          placeholder="What does this workflow accomplish?" rows={2}
          className="w-full text-sm font-light px-0 py-2 bg-transparent border-b focus:outline-none resize-none mb-8"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }} />
      ) : workflow.description && (
        <p className="text-sm font-light mb-8 max-w-2xl" style={{ color: 'var(--text-2)' }}>{workflow.description}</p>
      )}

      {/* Run input modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowRunModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--surface-2, #1a1a1a)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Run · {workflow.name}
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              {workflow.stages.length > 0 ? `${workflow.stages.length} stages` : 'No stages'} · {workflow.systemName}
            </p>
            <textarea
              value={runInput}
              onChange={e => setRunInput(e.target.value)}
              placeholder="Describe what this run should accomplish, include any relevant context or data···"
              rows={4}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleRun(runInput); if (e.key === 'Escape') setShowRunModal(false); }}
              className="w-full text-sm font-light px-4 py-3 rounded-xl focus:outline-none resize-none mb-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>⌘↵ to start</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowRunModal(false)}
                  className="text-xs font-light px-3 py-2 rounded-lg"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Cancel
                </button>
                <button onClick={() => handleRun(runInput)}
                  className="text-xs font-light px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(21,173,112,0.12)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}>
                  ▶ Start run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active run banner */}
      {activeRun && currentStageIdx !== null && (
        <div className="mb-8 px-5 py-4 rounded-xl flex items-center justify-between"
          style={{ background: 'rgba(21,173,112,0.06)', border: '1px solid rgba(21,173,112,0.2)' }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#15AD70' }} />
            <div>
              <p className="text-sm font-light" style={{ color: '#15AD70' }}>
                Run in progress — Stage {Math.min(currentStageIdx + 1, workflow.stages.length)} of {workflow.stages.length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {workflow.stages[currentStageIdx] ?? 'Finalising'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => advanceStage(activeRun.id, currentStageIdx + 1)}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(21,173,112,0.15)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}>
              {currentStageIdx + 1 >= workflow.stages.length ? 'Complete run ✓' : `Next: ${workflow.stages[currentStageIdx + 1] ?? '—'} →`}
            </button>
            <button onClick={async () => {
              await fetch(`/api/executions/${activeRun.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'FAILED' }),
              });
              setExecutions(prev => prev.map(e => e.id === activeRun.id ? { ...e, status: 'FAILED' } : e));
              setActiveRun(null);
            }} className="text-xs font-light px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.15)', color: 'rgba(255,100,100,0.7)' }}>
              Abandon
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          {/* Stage pipeline */}
          <div>
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>STAGES</p>

            {(editing ? editStages : workflow.stages).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl"
                style={{ border: '1px dashed var(--glass-border)' }}>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No stages defined</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{editing ? 'Add stages below' : 'Click Edit to add stages'}</p>
              </div>
            ) : (
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {(editing ? editStages : workflow.stages).map((stage, idx) => {
                  const isDone = currentStageIdx !== null && idx < currentStageIdx;
                  const isActive = currentStageIdx === idx && activeRun;
                  const stageColor = isDone ? '#15AD70' : isActive ? '#F7C700' : 'rgba(255,255,255,0.2)';

                  return (
                    <div key={idx} className="flex items-center">
                      <div className="flex flex-col items-center px-4 py-3 rounded-xl min-w-[110px] relative transition-all"
                        style={{
                          background: isActive ? 'rgba(247,199,0,0.06)' : isDone ? 'rgba(21,173,112,0.06)' : 'var(--glass)',
                          border: `1px solid ${isActive ? 'rgba(247,199,0,0.2)' : isDone ? 'rgba(21,173,112,0.2)' : 'var(--glass-border)'}`,
                        }}>
                        <span className="text-xs font-light mb-1.5 tabular-nums" style={{ color: stageColor }}>
                          {isDone ? '✓' : String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-light text-center leading-tight" style={{ color: isActive ? '#F7C700' : isDone ? '#15AD70' : 'rgba(255,255,255,0.7)' }}>
                          {stage}
                        </span>
                        {editing && (
                          <button onClick={() => setEditStages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,60,60,0.2)', color: '#FF7070' }}>×</button>
                        )}
                      </div>
                      {idx < (editing ? editStages : workflow.stages).length - 1 && (
                        <div className="w-6 h-px flex-shrink-0 transition-all"
                          style={{ background: idx < (currentStageIdx ?? -1) ? 'rgba(21,173,112,0.4)' : 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {editing && (
              <div className="flex items-center gap-2 mt-3">
                <input value={newStage} onChange={e => setNewStage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStage()}
                  placeholder="Add stage name···"
                  className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none flex-1"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white' }} />
                <button onClick={addStage} disabled={!newStage.trim()}
                  className="text-xs font-light px-3 py-2 rounded-lg disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Run history */}
          <div>
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>
              RUNS ({executions.length})
            </p>
            {executions.length === 0 ? (
              <div className="flex flex-col items-center py-10 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No runs yet</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Click ▶ Run to start the first execution</p>
              </div>
            ) : (
              <div className="space-y-2">
                {executions.map(exec => (
                  <Link key={exec.id} href={`/executions/${exec.id}`}
                    className="flex items-start gap-4 px-4 py-3 rounded-lg group transition-all"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', display: 'flex' }}>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: exec.status === 'COMPLETED' ? '#15AD70' : exec.status === 'RUNNING' ? '#F7C700' : '#FF7070' }} />
                      <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{exec.status.toLowerCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light group-hover:text-white/80 transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>{exec.input}</p>
                      {exec.status === 'RUNNING' && exec.currentStage !== null && (
                        <p className="text-xs mt-1" style={{ color: '#F7C700' }}>
                          Stage {exec.currentStage + 1}/{workflow.stages.length}: {workflow.stages[exec.currentStage]}
                        </p>
                      )}
                      {exec.status === 'COMPLETED' && (
                        <p className="text-xs mt-1" style={{ color: 'rgba(191,159,241,0.5)' }}>View Nova output →</p>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                      {new Date(exec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>DETAILS</p>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            {[
              { label: 'Status', value: workflow.status.toLowerCase() },
              { label: 'System', value: workflow.systemName },
              { label: 'Environment', value: workflow.environmentName },
              { label: 'Stages', value: workflow.stages.length },
              { label: 'Total runs', value: executions.length },
              { label: 'Updated', value: new Date(workflow.updatedAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Link href={`/workflows/${workflow.id}/edit`}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-xs font-light transition-all group"
              style={{ background: 'rgba(113,147,237,0.06)', border: '1px solid rgba(113,147,237,0.18)', color: 'rgba(113,147,237,0.7)' }}>
              <span className="flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                  <circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Visual builder
              </span>
              <span className="opacity-50 group-hover:opacity-100 transition-opacity">→</span>
            </Link>

            {/* Save as template */}
            <button
              onClick={async () => {
                await fetch(`/api/workflows/${workflow.id}/save-template`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ category: 'Custom' }),
                });
                setSavedAsTemplate(true);
                setTimeout(() => setSavedAsTemplate(false), 3000);
              }}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-light transition-all"
              style={{
                background: savedAsTemplate ? 'rgba(21,173,112,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${savedAsTemplate ? 'rgba(21,173,112,0.2)' : 'var(--glass-border)'}`,
                color: savedAsTemplate ? '#15AD70' : 'rgba(255,255,255,0.35)',
              }}>
              <span className="flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 1h8l1 3H1L2 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  <rect x="2" y="4" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M4 7.5h4M4 9.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                {savedAsTemplate ? '✓ Saved as template' : 'Save as template'}
              </span>
            </button>

            {versions.length > 0 && (
              <button onClick={() => setShowVersions(v => !v)}
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-light transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.35)' }}>
                <span className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M6 3v3l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                  {versions.length} version{versions.length !== 1 ? 's' : ''}
                </span>
                <span style={{ opacity: 0.5 }}>{showVersions ? '▲' : '▼'}</span>
              </button>
            )}

            {showVersions && versions.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                {versions.slice(0, 8).map((v, i) => (
                  <div key={v.id}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    style={{ borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none', background: 'var(--glass)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono" style={{ color: 'rgba(113,147,237,0.7)' }}>v{v.version}</span>
                      <span className="font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {v.description ?? 'Saved'}
                      </span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
