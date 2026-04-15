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
  const stages = topoSortStages(spec.stages);
  const outputs: Record<string, { output: string }> = {};
  const results: StageResult[] = [];

  let totalTokens = 0;
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  let anyFailed = false;
  let halted = false;

  for (const stage of stages) {
    if (halted) {
      const skipped = skippedStage(stage, 'upstream failure halted workflow');
      results.push(skipped);
      opts.onStage?.(skipped);
      continue;
    }

    // ─── Skip if a dependency failed ──────────────────────────────────
    const failedDep = stage.dependsOn.find(
      (d) => results.find((r) => r.stageId === d)?.status === 'failed'
    );
    if (failedDep) {
      const skipped = skippedStage(stage, `dependency "${failedDep}" failed`);
      results.push(skipped);
      opts.onStage?.(skipped);
      continue;
    }

    // ─── Interpolate instruction ──────────────────────────────────────
    const instruction = interpolateInstruction(stage.instruction, {
      input,
      stages: outputs,
    });

    // ─── Call kernel ──────────────────────────────────────────────────
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

      const result = successStage(stage, kr, Date.now() - stageStart);
      outputs[stage.id] = { output: kr.text };
      results.push(result);
      opts.onStage?.(result);

      totalTokens += kr.tokens.total;
      totalCostUsd += kr.costUsd;
      totalDurationMs += result.durationMs;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const result: StageResult = {
        stageId: stage.id,
        stageName: stage.name,
        status: 'failed',
        output: '',
        tokens: 0,
        costUsd: 0,
        durationMs: Date.now() - stageStart,
        error: message,
      };
      results.push(result);
      opts.onStage?.(result);
      anyFailed = true;

      if (stage.critical || opts.failFast) {
        halted = true;
      }
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
