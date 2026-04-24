'use client';

/**
 * /projects/[id] — the Zapier-style run trace page.
 *
 * This is the artifact that makes GRID the first AI-native workspace:
 * a live, step-by-step, tool-labeled, human-reviewable, artifact-
 * linked ledger of a multi-day project. Every step is a card. Every
 * card shows tool, rationale, status, and (when present) the deep
 * link back to the native tool where the artifact lives.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Project, Step, StepStatus, ToolSlug } from '@/lib/projects/types';
import BackToEnvironment from '@/components/BackToEnvironment';
import ActivityButton from '@/components/ActivityButton';
import FirstProjectTour from '@/components/FirstProjectTour';

const TOOL_COLOR: Record<ToolSlug, string> = {
  figma: '#E879F9',
  canva: '#6395FF',
  adobe: '#FF8C69',
  notion: '#BF9FF1',
  slack: '#C8F26B',
  gmail: '#F5D76E',
  google_calendar: '#7193ED',
  google_drive: '#15AD70',
  meta_ads: '#6395FF',
  linkedin_ads: '#6395FF',
  google_ads: '#F5D76E',
  stripe: '#BF9FF1',
  hubspot: '#FF8C69',
  attio: '#BF9FF1',
  linear: '#7193ED',
  github: '#C8F26B',
  claude: '#C8F26B',
  human: '#E879F9',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  needs_approval: 'Needs approval',
  done: 'Done',
  skipped: 'Skipped',
  failed: 'Failed',
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pending: '#8B9AA8',
  running: '#BF9FF1',
  needs_approval: '#F5D76E',
  done: '#C8F26B',
  skipped: '#7193ED',
  failed: '#FF6B6B',
};

export default function ProjectRunPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyStepId, setBusyStepId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch(`/api/projects/${params.id}`)
      .then(r => r.json())
      .then(d => { setProject(d.project ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function patch(op: 'advance' | 'approve' | 'skip', stepId: number, note?: string) {
    setBusyStepId(stepId);
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, stepId, note }),
      });
      const data = await res.json();
      if (data.project) setProject(data.project);
    } finally {
      setBusyStepId(null);
    }
  }

  if (loading) {
    return (
      <div className="px-4 md:px-10 py-8 max-w-4xl mx-auto">
        <div className="h-10 rounded animate-pulse mb-4" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Project not found.</p>
      </div>
    );
  }

  const doneCount = project.plan.filter(s => s.status === 'done').length;
  const pct = project.plan.length > 0 ? Math.round((doneCount / project.plan.length) * 100) : 0;

  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-2 gap-3">
        <BackToEnvironment environmentId={project.environmentId} />
        <ActivityButton entityType="Workflow" entityId={project.id} entityLabel={project.goal.slice(0, 60)} />
      </div>
      {/* Header */}
      <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Project · {project.status.replace('_', ' ')}
      </p>
      <h1
        data-tour="project-goal"
        className="text-2xl md:text-3xl font-extralight tracking-tight mb-2"
        style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
      >
        {project.goal}
      </h1>
      <div className="flex items-center gap-3 mb-6">
        <span
          className="h-1 w-40 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span
            className="h-full block rounded-full"
            style={{ width: `${pct}%`, background: STATUS_COLOR[project.status === 'done' ? 'done' : 'running'] }}
          />
        </span>
        <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {doneCount}/{project.plan.length} steps · started {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>

      <NarrativeBlock projectId={project.id} />

      {/* Steps */}
      <section data-tour="project-plan" className="mb-10 space-y-3">
        {project.plan.map(step => (
          <StepCard
            key={step.id}
            step={step}
            busy={busyStepId === step.id}
            onApprove={() => patch('approve', step.id)}
            onAdvance={() => patch('advance', step.id)}
            onSkip={() => patch('skip', step.id)}
          />
        ))}
      </section>

      {/* Artifacts */}
      {project.artifacts.length > 0 && (
        <section className="mb-10">
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Artifacts produced
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {project.artifacts.map(a => (
              <a
                key={a.id}
                href={a.url ?? '#'}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-xl p-4 transition-colors"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: TOOL_COLOR[a.tool] }}
                  />
                  <span className="text-[10px] font-light tracking-wider uppercase" style={{ color: 'var(--text-3)' }}>
                    {a.tool}
                  </span>
                  <span className="ml-auto text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                    {a.kind}
                  </span>
                </div>
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{a.name}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Trace */}
      <section>
        <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
          Run trace
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          {project.trace.map((t, i) => (
            <div
              key={i}
              className="px-5 py-3 flex items-start gap-3"
              style={{
                borderBottom: i < project.trace.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                style={{
                  background: t.source === 'nova' ? '#BF9FF1' : t.source === 'human' ? '#C8F26B' : '#8B9AA8',
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{t.message}</p>
                <p className="text-[11px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {t.source} · {new Date(t.at).toLocaleString()}
                  {t.stepId != null ? ` · step ${t.stepId}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <FirstProjectTour />
    </div>
  );
}

function ClassifierBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-light px-2 py-0.5 rounded-full"
      style={{
        background: `${color}0e`,
        border: `1px solid ${color}22`,
        color: 'var(--text-3)',
      }}
      title={`${label}: ${value}`}
    >
      <span style={{ color, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label.slice(0, 3)}
      </span>
      <span style={{ color: 'var(--text-2)' }}>{value}</span>
    </span>
  );
}

function NarrativeBlock({ projectId }: { projectId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/narrative`)
      .then(r => r.json())
      .then(d => { setText(d.text ?? null); setSource(d.source ?? null); })
      .catch(() => {});
  }, [projectId]);

  if (!text) return null;
  return (
    <div
      className="rounded-2xl p-5 mb-8"
      style={{
        background: 'rgba(191,159,241,0.04)',
        border: '1px solid rgba(191,159,241,0.18)',
      }}
    >
      <p
        className="text-[10px] tracking-[0.18em] uppercase font-light mb-2"
        style={{ color: '#BF9FF1' }}
      >
        Nova's take
        {source === 'fallback' ? ' · template' : ''}
      </p>
      <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
        {text}
      </p>
    </div>
  );
}

function StepCard({
  step,
  busy,
  onApprove,
  onAdvance,
  onSkip,
}: {
  step: Step;
  busy: boolean;
  onApprove: () => void;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const tone = STATUS_COLOR[step.status];
  const toolTone = TOOL_COLOR[step.tool];
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        opacity: step.status === 'skipped' ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-light"
          style={{
            background: `${toolTone}14`,
            border: `1px solid ${toolTone}30`,
            color: toolTone,
          }}
        >
          {step.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{step.title}</p>
            <span
              className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{ color: toolTone, background: `${toolTone}14`, border: `1px solid ${toolTone}30` }}
            >
              {step.tool}
            </span>
            <span
              className="ml-auto text-[10px] font-light tracking-wider uppercase"
              style={{ color: tone }}
            >
              {STATUS_LABEL[step.status]}
            </span>
          </div>
          <p className="text-xs font-light leading-relaxed mb-2" style={{ color: 'var(--text-3)' }}>
            {step.rationale}
          </p>
          {step.classifier && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <ClassifierBadge label="Location" value={step.classifier.location} color="#7193ED" />
              <ClassifierBadge label="Action" value={step.classifier.action} color="#C8F26B" />
              <ClassifierBadge label="Interaction" value={step.classifier.interaction.replace(/_/g, ' ')} color="#F5D76E" />
              <ClassifierBadge label="Execution" value={step.classifier.execution.replace(/_/g, ' ')} color="#BF9FF1" />
            </div>
          )}
          {step.approval?.required && step.status !== 'done' && step.status !== 'skipped' && (
            <p className="text-[11px] font-light mt-2" style={{ color: '#F5D76E' }}>
              HITL gate: {step.approval.reason}
            </p>
          )}
        </div>
      </div>

      {step.status !== 'done' && step.status !== 'skipped' && step.status !== 'failed' && (
        <div className="flex items-center gap-2 mt-3">
          {step.approval?.required ? (
            <button
              onClick={onApprove}
              disabled={busy}
              className="text-xs font-light px-4 py-1.5 rounded-full disabled:opacity-40"
              style={{
                background: 'rgba(200,242,107,0.1)',
                border: '1px solid rgba(200,242,107,0.3)',
                color: '#C8F26B',
              }}
            >
              {busy ? '…' : 'Approve this step'}
            </button>
          ) : (
            <button
              onClick={onAdvance}
              disabled={busy}
              className="text-xs font-light px-4 py-1.5 rounded-full disabled:opacity-40"
              style={{
                background: 'rgba(191,159,241,0.1)',
                border: '1px solid rgba(191,159,241,0.3)',
                color: '#BF9FF1',
              }}
            >
              {busy ? '…' : 'Mark done'}
            </button>
          )}
          <button
            onClick={onSkip}
            disabled={busy}
            className="text-xs font-light px-4 py-1.5 rounded-full disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
            }}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
