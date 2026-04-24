/**
 * GET  /api/projects/[id]      — read a project
 * PATCH /api/projects/[id]     — advance, approve, or update step state
 *    body one of:
 *      { op: 'advance', stepId }
 *      { op: 'approve', stepId }
 *      { op: 'skip', stepId, note? }
 *      { op: 'add_artifact', stepId, artifact: Artifact }
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { readProject, writeProject } from '@/lib/projects/store';
import { runAutoChain } from '@/lib/projects/run';
import type { Artifact, Project, TraceEntry } from '@/lib/projects/types';

function touch(project: Project, entry: Omit<TraceEntry, 'at'>): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    trace: [
      ...project.trace,
      { at: new Date().toISOString(), ...entry },
    ],
  };
}


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const project = await readProject(id, identity.id);
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ project });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const op = body?.op as string;

  const project = await readProject(id, identity.id);
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  let next = project;

  if (op === 'advance' || op === 'approve') {
    const stepIdx = project.plan.findIndex(s => s.id === body.stepId);
    if (stepIdx < 0) return Response.json({ error: 'Unknown step' }, { status: 400 });
    const updated = [...project.plan];
    updated[stepIdx] = {
      ...updated[stepIdx],
      status: 'done',
      completedAt: new Date().toISOString(),
    };
    // Advance cursor + mark the next eligible step as running (or
    // needs_approval if the default gate is on).
    const cursor = stepIdx + 1;
    if (cursor < updated.length) {
      const nextStep = updated[cursor];
      updated[cursor] = {
        ...nextStep,
        // On approval we clear the gate on this specific step so the
        // auto-run chain can execute it. The default gate returns
        // on the *next* unapproved step.
        status: nextStep.approval?.required && op !== 'approve' ? 'needs_approval' : 'running',
        startedAt: new Date().toISOString(),
      };
    }
    const advanced = touch({ ...project, plan: updated, cursor }, {
      stepId: project.plan[stepIdx].id,
      source: 'human',
      message: op === 'approve'
        ? `Approved step: ${project.plan[stepIdx].title}`
        : `Advanced past step: ${project.plan[stepIdx].title}`,
    });
    if (cursor >= updated.length) {
      advanced.status = 'done';
      advanced.trace.push({
        at: new Date().toISOString(),
        stepId: null,
        source: 'nova',
        message: 'Project complete. All steps have landed.',
      });
      next = advanced;
    } else {
      // Auto-run the chain of non-gated steps until we hit the next
      // human checkpoint. Keeps the product feeling alive.
      next = await runAutoChain(advanced);
    }
  } else if (op === 'skip') {
    const stepIdx = project.plan.findIndex(s => s.id === body.stepId);
    if (stepIdx < 0) return Response.json({ error: 'Unknown step' }, { status: 400 });
    const updated = [...project.plan];
    updated[stepIdx] = { ...updated[stepIdx], status: 'skipped' };
    next = touch({ ...project, plan: updated }, {
      stepId: project.plan[stepIdx].id,
      source: 'human',
      message: `Skipped step: ${project.plan[stepIdx].title}${body.note ? ` — ${body.note}` : ''}`,
    });
  } else if (op === 'add_artifact') {
    const artifact = body.artifact as Artifact;
    const stepId = body.stepId as number;
    const updated = project.plan.map(s =>
      s.id === stepId ? { ...s, artifactIds: [...(s.artifactIds ?? []), artifact.id] } : s,
    );
    next = touch(
      { ...project, plan: updated, artifacts: [...project.artifacts, artifact] },
      {
        stepId,
        source: 'nova',
        message: `Artifact added: ${artifact.name}`,
      },
    );
  } else {
    return Response.json({ error: 'Unknown op' }, { status: 400 });
  }

  await writeProject(id, next);
  return Response.json({ project: next });
}
