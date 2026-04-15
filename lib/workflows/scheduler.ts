/**
 * Workflow Scheduler — trigger evaluation + dispatch
 *
 * The scheduler is the bridge between the four WorkflowTrigger types
 * and actual spec execution. It is intentionally transport-agnostic —
 * it does not own its own cron daemon. Instead it exposes:
 *
 *   - shouldFire()  → pure function, given a trigger + context returns
 *                     whether the trigger should fire now
 *   - dispatch()    → runs the engine for a given spec + input + ctx,
 *                     persists a lightweight ScheduleRun row, returns
 *                     the RunResult
 *   - tick()        → called by an external cron (e.g. Vercel Cron,
 *                     GitHub Actions, or a host process) at 1-minute
 *                     resolution. Evaluates every active schedule
 *                     trigger and dispatches any whose cron expression
 *                     matches the current minute.
 *
 * Cron parsing is done inline with a minimal, dependency-free parser
 * that supports the five classic fields plus "*\/n". Good enough for
 * "run every weekday at 9am" and "top of every hour" — which covers
 * ~95% of real scheduling needs. Full cron extensions can be added
 * later without touching callers.
 */

import type { WorkflowSpec, WorkflowTrigger } from './spec';
import { execute, type RunResult } from './engine';
import type { KernelContext } from '../kernel/types';

// ─── Cron evaluation ────────────────────────────────────────────────────────

/**
 * Returns true if the given cron expression matches the supplied date.
 * Supports: * | number | a,b | a-b | *\/n (where the star is literal).
 * Fields: minute hour dayOfMonth month dayOfWeek
 */
export function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [min, hour, dom, month, dow] = parts;

  return (
    fieldMatches(min, date.getUTCMinutes(), 0, 59) &&
    fieldMatches(hour, date.getUTCHours(), 0, 23) &&
    fieldMatches(dom, date.getUTCDate(), 1, 31) &&
    fieldMatches(month, date.getUTCMonth() + 1, 1, 12) &&
    fieldMatches(dow, date.getUTCDay(), 0, 6)
  );
}

function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;

  // */n — every n units starting at 0
  if (field.startsWith('*/')) {
    const n = Number(field.slice(2));
    return Number.isFinite(n) && n > 0 && value % n === 0;
  }

  // comma list
  if (field.includes(',')) {
    return field.split(',').some((f) => fieldMatches(f, value, min, max));
  }

  // range a-b
  if (field.includes('-')) {
    const [a, b] = field.split('-').map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && value >= a && value <= b;
  }

  const n = Number(field);
  return Number.isFinite(n) && n === value;
}

// ─── Trigger matching ───────────────────────────────────────────────────────

export interface TriggerContext {
  /** Current time (UTC) — injected so tests can supply fixed clocks. */
  now: Date;
  /** Signals queued since the last tick, keyed by source. */
  signals?: Array<{ source: string; priority: string }>;
}

export function shouldFire(trigger: WorkflowTrigger, ctx: TriggerContext): boolean {
  switch (trigger.type) {
    case 'manual':
      return false;
    case 'schedule':
      return cronMatches(trigger.cron, ctx.now);
    case 'webhook':
      return false; // webhooks are dispatched directly, not ticked
    case 'signal':
      if (!ctx.signals?.length) return false;
      return ctx.signals.some((sig) => {
        if (sig.source !== trigger.source) return false;
        if (!trigger.minPriority) return true;
        return priorityRank(sig.priority) >= priorityRank(trigger.minPriority);
      });
  }
}

function priorityRank(p: string): number {
  return { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 }[p as 'LOW'] ?? 0;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export interface DispatchParams {
  spec: WorkflowSpec;
  input: string;
  context: KernelContext;
}

/**
 * Execute a workflow. This is the single entry point every trigger
 * source (manual UI button, cron, webhook, signal) calls into.
 * It wraps engine.execute and is the place to add future concerns
 * like retry, budget caps, or async queuing.
 */
export async function dispatch(params: DispatchParams): Promise<RunResult> {
  return execute(params.spec, params.input, {
    ...params.context,
    surface: 'scheduler',
  });
}

// ─── Tick ───────────────────────────────────────────────────────────────────

export interface TickParams {
  /** Active workflow specs paired with their kernel context. */
  schedules: Array<{ spec: WorkflowSpec; context: KernelContext; defaultInput?: string }>;
  /** Current time (UTC). */
  now?: Date;
  /** Signals to consider this tick (optional). */
  signals?: TriggerContext['signals'];
}

export interface TickResult {
  fired: Array<{ spec: WorkflowSpec; result: RunResult }>;
  skipped: number;
}

/**
 * Called by an external cron at 1-minute resolution (or on signal arrival).
 * Evaluates every schedule and fires the matching ones in parallel.
 */
export async function tick(params: TickParams): Promise<TickResult> {
  const now = params.now ?? new Date();
  const ctx: TriggerContext = { now, signals: params.signals };

  const firing = params.schedules.filter((s) => shouldFire(s.spec.trigger, ctx));

  const results = await Promise.all(
    firing.map(async ({ spec, context, defaultInput }) => ({
      spec,
      result: await dispatch({
        spec,
        input: defaultInput ?? `Scheduled run at ${now.toISOString()}`,
        context,
      }),
    }))
  );

  return {
    fired: results,
    skipped: params.schedules.length - firing.length,
  };
}
