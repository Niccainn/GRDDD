/**
 * Workflow Engine — stateless executor for WorkflowSpec
 *
 * Given a spec, an input, and a KernelContext, this engine:
 *
 *   1. Topologically sorts the stages by dependsOn
 *   2. For each stage, interpolates its instruction with prior outputs
 *   3. Calls kernel.run() for the stage with its allowed tools + tier
 *   4. Stores the stage output in the run map
 *   5. Handles failure according to stage.critical
 *   6. Returns a RunResult containing per-stage outcomes + totals
 *
 * Crucially: the engine holds no state. It does not touch the database
 * beyond what the kernel does via trace persistence. Callers that want
 * to persist an Execution row do that themselves and pass the id back.
 */

import {
  type WorkflowSpec,
  type StageSpec,
  topoSortStages,
  interpolateInstruction,
} from './spec';
import { run as kernelRun } from '../kernel/runtime';
import type { KernelContext, KernelResponse } from '../kernel/types';

// ─── Result types ───────────────────────────────────────────────────────────

export interface StageResult {
  stageId: string;
  stageName: string;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  traceId?: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

export interface RunResult {
  spec: WorkflowSpec;
  status: 'success' | 'failed' | 'partial';
  stages: StageResult[];
  totalTokens: number;
  totalCostUsd: number;
  totalDurationMs: number;
  startedAt: Date;
  endedAt: Date;
}

export interface ExecuteOptions {
  /** Progress callback — emits after each stage. */
  onStage?: (result: StageResult) => void;
  /** If true, continue running non-critical failures instead of halting. */
  failFast?: boolean;
  /** Override tier for all stages (testing). */
  tierOverride?: 'fast' | 'balanced' | 'deep';
}

// ─── Executor ───────────────────────────────────────────────────────────────

export async function execute(
  spec: WorkflowSpec,
  input: string,
  context: KernelContext,
  opts: ExecuteOptions = {}
): Promise<RunResult> {
  const startedAt = new Date();
  // topoSortStages is still called so the DAG is validated (throws on cycles),
  // but we execute by wavefront rather than by the linear topo order —
  // any stage whose deps are done runs *in parallel* with its siblings.
  topoSortStages(spec.stages);

  const byId = new Map(spec.stages.map(s => [s.id, s]));
  const outputs: Record<string, { output: string }> = {};
  const results: StageResult[] = [];
  const resultById = new Map<string, StageResult>();

  let totalTokens = 0;
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  let anyFailed = false;
  let halted = false;

  // Track remaining work. Each wave: pick every unblocked stage, run
  // them concurrently, record results, repeat until empty.
  const remaining = new Set(spec.stages.map(s => s.id));

  const runStage = async (stageId: string) => {
    const stage = byId.get(stageId)!;

    if (halted) {
      const skipped = skippedStage(stage, 'upstream failure halted workflow');
      return skipped;
    }

    const failedDep = stage.dependsOn.find(
      d => resultById.get(d)?.status === 'failed',
    );
    if (failedDep) {
      return skippedStage(stage, `dependency "${failedDep}" failed`);
    }

    const instruction = interpolateInstruction(stage.instruction, {
      input,
      stages: outputs,
    });

    const stageStart = Date.now();
    try {
      const kr = await kernelRun({
        context: { ...context, surface: 'workflow' },
        tier: opts.tierOverride ?? stage.tier,
        systemPrompt: instruction,
        messages: [{ role: 'user', content: input }],
        tools: stage.tools,
        maxTokens: stage.maxTokens,
      });
      const r = successStage(stage, kr, Date.now() - stageStart);
      // Capture side-effects for the caller — tokens, output, cost.
      // These need atomic-ish updates when run concurrently but JS
      // is single-threaded so a local accumulator in the caller is fine.
      return { ...r, __kr: kr };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const r: StageResult & { __err: true } = {
        stageId: stage.id,
        stageName: stage.name,
        status: 'failed',
        output: '',
        tokens: 0,
        costUsd: 0,
        durationMs: Date.now() - stageStart,
        error: message,
        __err: true,
      };
      return r;
    }
  };

  while (remaining.size > 0) {
    // A stage is ready when every dep is already in resultById.
    const ready: string[] = [];
    for (const id of remaining) {
      const stage = byId.get(id)!;
      if (stage.dependsOn.every(d => resultById.has(d))) ready.push(id);
    }
    if (ready.length === 0) {
      // Defensive — topoSort should have thrown on cycles. If we land
      // here it means data corruption; skip the rest with a clear reason.
      for (const id of remaining) {
        const stage = byId.get(id)!;
        const r = skippedStage(stage, 'unresolved dependency cycle');
        results.push(r);
        resultById.set(stage.id, r);
        opts.onStage?.(r);
      }
      break;
    }

    // Run this wave in parallel. Promise.all is intentional — concurrent
    // Anthropic calls for independent stages is the whole point.
    const waveResults = await Promise.all(ready.map(runStage));

    for (let i = 0; i < ready.length; i++) {
      const stageId = ready[i];
      const stage = byId.get(stageId)!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = waveResults[i] as any;

      if (w.status === 'success' && w.__kr) {
        const kr = w.__kr as KernelResponse;
        outputs[stage.id] = { output: kr.text };
        totalTokens += kr.tokens.total;
        totalCostUsd += kr.costUsd;
        totalDurationMs += w.durationMs;
        delete w.__kr;
      } else if (w.status === 'failed') {
        anyFailed = true;
        if (stage.critical || opts.failFast) halted = true;
      }

      results.push(w);
      resultById.set(stage.id, w);
      opts.onStage?.(w);
      remaining.delete(stageId);
    }
  }

  const endedAt = new Date();
  const status: RunResult['status'] = anyFailed
    ? halted
      ? 'failed'
      : 'partial'
    : 'success';

  return {
    spec,
    status,
    stages: results,
    totalTokens,
    totalCostUsd,
    totalDurationMs,
    startedAt,
    endedAt,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function successStage(
  stage: StageSpec,
  kr: KernelResponse,
  durationMs: number
): StageResult {
  return {
    stageId: stage.id,
    stageName: stage.name,
    status: 'success',
    output: kr.text,
    traceId: kr.traceId,
    tokens: kr.tokens.total,
    costUsd: kr.costUsd,
    durationMs,
  };
}

function skippedStage(stage: StageSpec, reason: string): StageResult {
  return {
    stageId: stage.id,
    stageName: stage.name,
    status: 'skipped',
    output: '',
    tokens: 0,
    costUsd: 0,
    durationMs: 0,
    error: reason,
  };
}
