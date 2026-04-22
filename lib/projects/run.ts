/**
 * Auto-run chain — after project creation or step approval, execute
 * the next auto-runnable steps until we hit a human gate, an error,
 * or the end of the plan. Bounded by MAX_CHAIN to prevent runaway
 * executors.
 *
 * Returns the fully-updated Project; caller persists it.
 */

import { execute, isAutoRunnable } from '@/lib/skills/executors';
import type { Project, TraceEntry } from './types';

const MAX_CHAIN = 5;

export async function runAutoChain(project: Project): Promise<Project> {
  let current = project;
  let iterations = 0;
  while (iterations < MAX_CHAIN) {
    iterations++;
    const idx = current.cursor;
    if (idx >= current.plan.length) break;
    const step = current.plan[idx];
    if (step.status === 'done' || step.status === 'skipped' || step.status === 'failed') {
      current = { ...current, cursor: idx + 1 };
      continue;
    }
    if (step.status === 'needs_approval') break;
    if (!isAutoRunnable(step)) break;

    const result = await execute(step, current);
    const nextPlan = [...current.plan];
    nextPlan[idx] = result.step;

    const now = new Date().toISOString();
    const newTrace: TraceEntry[] = [
      ...current.trace,
      ...result.trace.map(t => ({ at: now, ...t })),
    ];
    const nextArtifacts = [...current.artifacts, ...result.artifacts];

    let nextCursor = current.cursor;
    let nextStatus = current.status;
    if (result.step.status === 'done' || result.step.status === 'skipped') {
      nextCursor = current.cursor + 1;
      if (nextCursor < nextPlan.length) {
        const upcoming = nextPlan[nextCursor];
        nextPlan[nextCursor] = {
          ...upcoming,
          status: upcoming.approval?.required ? 'needs_approval' : 'running',
          startedAt: now,
        };
      } else {
        nextStatus = 'done';
        newTrace.push({
          at: now,
          stepId: null,
          source: 'nova',
          message: 'Project complete. All steps have landed.',
        });
      }
    } else if (result.step.status === 'needs_approval') {
      nextStatus = 'awaiting_approval';
    } else if (result.step.status === 'failed') {
      nextStatus = 'failed';
      current = {
        ...current,
        plan: nextPlan,
        artifacts: nextArtifacts,
        trace: newTrace,
        status: nextStatus,
        updatedAt: now,
      };
      break;
    }

    current = {
      ...current,
      plan: nextPlan,
      artifacts: nextArtifacts,
      trace: newTrace,
      cursor: nextCursor,
      status: nextStatus,
      updatedAt: now,
    };

    if (nextCursor < nextPlan.length) {
      const upcoming = nextPlan[nextCursor];
      if (!isAutoRunnable(upcoming) || upcoming.status === 'needs_approval') break;
    }
  }
  return current;
}
