'use client';

import { useState } from 'react';
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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initial.name);
  const [editDescription, setEditDescription] = useState(initial.description ?? '');
  const [editStages, setEditStages] = useState<string[]>(initial.stages.length > 0 ? initial.stages : []);
  const [newStage, setNewStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim() || null,
        stages: editStages,
      }),
    });
    const updated = await res.json();
    setWorkflow(w => ({
      ...w,
      name: updated.name,
      description: updated.description,
      stages: JSON.parse(updated.stages ?? '[]'),
    }));
    setSaving(false);
    setEditing(false);
  }

  async function handleRun() {
    setRunning(true);
    const res = await fetch('/api/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: workflow.id, systemId: workflow.systemId, input: `Manual run of ${workflow.name}` }),
    });
    const exec = await res.json();
    if (exec.id) {
      setExecutions(prev => [{ id: exec.id, status: exec.status, input: exec.input, output: exec.output, createdAt: exec.createdAt }, ...prev]);
    }
    setRunning(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/workflows/${workflow.id}`, { method: 'DELETE' });
    router.push('/workflows');
  }

  function addStage() {
    if (!newStage.trim()) return;
    setEditStages(prev => [...prev, newStage.trim()]);
    setNewStage('');
  }

  function removeStage(idx: number) {
    setEditStages(prev => prev.filter((_, i) => i !== idx));
  }

  const statusColor = STATUS_COLOR[workflow.status] ?? 'rgba(255,255,255,0.3)';

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Breadcrumb */}
      <Link
        href="/workflows"
        className="text-xs font-light mb-8 inline-flex items-center gap-1.5 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Workflows
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="text-2xl font-extralight tracking-tight bg-transparent border-b focus:outline-none w-full mb-2"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
            />
          ) : (
            <h1 className="text-2xl font-extralight tracking-tight mb-1">{workflow.name}</h1>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/systems/${workflow.systemId}`}
              className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {workflow.systemName}
            </Link>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <Link
              href={`/environments/${workflow.environmentSlug}`}
              className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {workflow.environmentName}
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-6">
          {/* Status selector */}
          <div className="relative group">
            <button
              className="flex items-center gap-2 text-xs font-light px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusColor}30`,
                color: statusColor,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {workflow.status.toLowerCase()}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <div
              className="absolute right-0 top-full mt-1 z-10 hidden group-focus-within:block group-hover:block rounded-lg overflow-hidden py-1"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', minWidth: '130px' }}
            >
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="w-full text-left px-3 py-1.5 text-xs font-light transition-colors hover:bg-white/5 flex items-center gap-2"
                  style={{ color: STATUS_COLOR[s] ?? 'rgba(255,255,255,0.5)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={running}
            className="text-xs font-light px-4 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(21,173,112,0.1)',
              border: '1px solid rgba(21,173,112,0.3)',
              color: '#15AD70',
            }}
          >
            {running ? 'Running···' : '▶ Run'}
          </button>

          {/* Edit / Save */}
          {editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              >
                {saving ? 'Saving···' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs font-light transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Edit
            </button>
          )}

          {/* Delete */}
          {confirmDelete ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,60,60,0.12)', color: '#FF7070', border: '1px solid rgba(255,60,60,0.2)' }}
              >
                {deleting ? '···' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              >
                No
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {editing ? (
        <textarea
          value={editDescription}
          onChange={e => setEditDescription(e.target.value)}
          placeholder="Describe what this workflow does..."
          rows={2}
          className="w-full text-sm font-light px-0 py-2 bg-transparent border-b focus:outline-none resize-none mb-8"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
        />
      ) : (
        workflow.description && (
          <p className="text-sm font-light mb-8 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {workflow.description}
          </p>
        )
      )}

      <div className="grid grid-cols-3 gap-8">
        {/* Left: Stages + Runs */}
        <div className="col-span-2 space-y-8">

          {/* Stage Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>STAGES</p>
            </div>

            {(editing ? editStages : workflow.stages).length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-xl"
                style={{ border: '1px dashed var(--border)' }}
              >
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No stages defined</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {editing ? 'Add stages below' : 'Click Edit to add stages'}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {(editing ? editStages : workflow.stages).map((stage, idx) => (
                  <div key={idx} className="flex items-center min-w-0">
                    <div
                      className="flex flex-col items-center px-4 py-3 rounded-xl min-w-[110px] relative"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <span
                        className="text-xs font-light mb-1.5 tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-light text-center leading-tight" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {stage}
                      </span>
                      {editing && (
                        <button
                          onClick={() => removeStage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,60,60,0.2)', color: '#FF7070' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {idx < (editing ? editStages : workflow.stages).length - 1 && (
                      <div className="w-6 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add stage input (edit mode) */}
            {editing && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStage()}
                  placeholder="Add stage name..."
                  className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none flex-1"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
                <button
                  onClick={addStage}
                  disabled={!newStage.trim()}
                  className="text-xs font-light px-3 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Execution History */}
          <div>
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
              RUNS <span style={{ color: 'var(--text-tertiary)' }}>({workflow.totalRuns})</span>
            </p>

            {executions.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-xl"
                style={{ border: '1px dashed var(--border)' }}
              >
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No runs yet</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Click ▶ Run to start the first execution</p>
              </div>
            ) : (
              <div className="space-y-2">
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    className="flex items-start gap-4 px-4 py-3 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            exec.status === 'COMPLETED' ? '#15AD70' :
                            exec.status === 'RUNNING' ? '#F7C700' : '#FF7070',
                        }}
                      />
                      <span className="text-xs font-light" style={{ color: 'var(--text-tertiary)' }}>
                        {exec.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {exec.input}
                      </p>
                      {exec.output && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                          {exec.output.slice(0, 200)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(exec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Meta */}
        <div>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>DETAILS</p>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {[
              { label: 'Status', value: workflow.status.toLowerCase() },
              { label: 'System', value: workflow.systemName },
              { label: 'Environment', value: workflow.environmentName },
              { label: 'Stages', value: workflow.stages.length },
              { label: 'Total runs', value: workflow.totalRuns },
              { label: 'Updated', value: new Date(workflow.updatedAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Link
              href={`/workflows/${workflow.id}/edit`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-light transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.4)' }}
            >
              Open node editor →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
