/**
 * WorkflowSpec — the portable workflow DSL
 *
 * A WorkflowSpec is a pure JSON description of a multi-stage pipeline
 * that Nova can execute end-to-end. It is the single source of truth
 * for a workflow — everything else (the DB row, the execution record,
 * the marketplace listing) is a wrapper around a spec.
 *
 * Design principles:
 *   1. Serializable.     Specs are JSON. No functions, no closures, no classes.
 *   2. Declarative.      Stages describe intent, not control flow.
 *   3. Composable.       A stage can depend on earlier stages by id.
 *   4. Tool-aware.       Stages can allow/deny specific kernel tools.
 *   5. Versioned.        Every spec carries a schema version for forward compat.
 *   6. Validated.        Zod schemas catch malformed specs at authoring time.
 *
 * Executing a spec is "just" calling the engine with a spec + input +
 * KernelContext. Every stage becomes one kernel run, one trace, one
 * cost line. Users see per-stage progress. Nova sees its own history.
 */

import { z } from 'zod';
import type { ModelTier } from '../kernel/types';

// ─── Schema version ─────────────────────────────────────────────────────────

export const SPEC_SCHEMA_VERSION = 1;

// ─── Trigger ────────────────────────────────────────────────────────────────

export const triggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('manual'),
  }),
  z.object({
    type: z.literal('schedule'),
    /** Cron expression, e.g. "0 9 * * 1" for every Monday at 09:00. */
    cron: z.string(),
    timezone: z.string().default('UTC'),
  }),
  z.object({
    type: z.literal('webhook'),
    /** Webhook path suffix, e.g. "client-signup". Full URL resolved by router. */
    path: z.string(),
  }),
  z.object({
    type: z.literal('signal'),
    /** Signal source that activates this workflow. */
    source: z.string(),
    /** Optional priority filter. */
    minPriority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  }),
]);

export type WorkflowTrigger = z.infer<typeof triggerSchema>;

// ─── Stage ──────────────────────────────────────────────────────────────────

export const stageSchema = z.object({
  /** Stable identifier, e.g. "narrative", "review". Referenced by dependsOn. */
  id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  /** Display name for UI. */
  name: z.string().min(1),
  /** One-line description of what this stage produces. */
  description: z.string().optional(),
  /**
   * The system prompt / instruction the kernel receives for this stage.
   * Supports ${input} and ${stages.X.output} template substitutions.
   */
  instruction: z.string().min(10),
  /** Which earlier stages must complete before this one runs. */
  dependsOn: z.array(z.string()).default([]),
  /** Kernel tools this stage may call. Empty = no tools. */
  tools: z.array(z.string()).default([]),
  /** Preferred model tier (router may override). */
  tier: z.enum(['fast', 'balanced', 'deep']).optional(),
  /** Maximum output tokens for this stage. */
  maxTokens: z.number().int().positive().optional(),
  /**
   * If true, the stage output is shown to the user for approval before
   * downstream stages run. Good for review/publish pipelines.
   */
  requiresApproval: z.boolean().default(false),
  /**
   * If true, a failure of this stage halts the whole workflow.
   * Default true; set false for best-effort enrichment stages.
   */
  critical: z.boolean().default(true),
});

export type StageSpec = z.infer<typeof stageSchema>;

// ─── Workflow spec ──────────────────────────────────────────────────────────

export const workflowSpecSchema = z.object({
  schemaVersion: z.literal(SPEC_SCHEMA_VERSION),
  /** Stable slug for marketplace & API references. */
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /** Display name. */
  name: z.string().min(1),
  /** One-sentence summary for marketplace cards. */
  tagline: z.string().min(1),
  /** Longer description in markdown. */
  description: z.string().optional(),
  /** Author attribution. */
  author: z
    .object({
      name: z.string(),
      handle: z.string().optional(),
    })
    .optional(),
  /** Semantic version of this spec. */
  version: z.string().default('1.0.0'),
  /** Department tag for filtering. */
  category: z.enum(['marketing', 'operations', 'content', 'engineering', 'product', 'general']),
  /** Free-form tags. */
  tags: z.array(z.string()).default([]),
  /** What triggers this workflow. */
  trigger: triggerSchema,
  /** Ordered stages. Topologically sorted by dependsOn at runtime. */
  stages: z.array(stageSchema).min(1),
  /** Expected input shape (Zod raw JSON schema, optional). */
  inputSchema: z
    .object({
      description: z.string(),
      example: z.string().optional(),
    })
    .optional(),
});

export type WorkflowSpec = z.infer<typeof workflowSpecSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse and validate a spec from untrusted input (e.g. marketplace import).
 * Throws a descriptive ZodError if invalid.
 */
export function parseSpec(input: unknown): WorkflowSpec {
  return workflowSpecSchema.parse(input);
}

/**
 * Safe parse — returns { ok, data } or { ok, error }.
 */
export function safeParseSpec(
  input: unknown
): { ok: true; data: WorkflowSpec } | { ok: false; error: string } {
  const result = workflowSpecSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.message };
}

/**
 * Topologically sort stages by their dependsOn graph.
 * Throws if the graph has a cycle or references an unknown stage.
 */
export function topoSortStages(stages: StageSpec[]): StageSpec[] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: StageSpec[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Cycle detected at stage "${id}"`);
    const stage = byId.get(id);
    if (!stage) throw new Error(`Unknown stage referenced: "${id}"`);
    visiting.add(id);
    for (const dep of stage.dependsOn) visit(dep);
    visiting.delete(id);
    visited.add(id);
    sorted.push(stage);
  }

  for (const s of stages) visit(s.id);
  return sorted;
}

/**
 * Template-interpolate a stage instruction with run-time values.
 * Supports ${input} and ${stages.X.output}.
 */
export function interpolateInstruction(
  instruction: string,
  values: { input: string; stages: Record<string, { output: string }> }
): string {
  return instruction.replace(/\$\{([^}]+)\}/g, (_, path: string) => {
    if (path === 'input') return values.input;
    const m = path.match(/^stages\.([a-z0-9_-]+)\.output$/i);
    if (m) return values.stages[m[1]]?.output ?? '';
    return '';
  });
}

/** Estimate how many tool slots a spec needs (informational). */
export function specToolCount(spec: WorkflowSpec): number {
  return new Set(spec.stages.flatMap((s) => s.tools)).size;
}

/** Depth of the longest dependency chain — rough complexity indicator. */
export function specDepth(spec: WorkflowSpec): number {
  const byId = new Map(spec.stages.map((s) => [s.id, s]));
  const memo = new Map<string, number>();
  function depth(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    const s = byId.get(id)!;
    const d = s.dependsOn.length === 0 ? 1 : 1 + Math.max(...s.dependsOn.map(depth));
    memo.set(id, d);
    return d;
  }
  return Math.max(...spec.stages.map((s) => depth(s.id)));
}

// ─── Public helper: canonical tier for a stage ──────────────────────────────

export function resolveTier(stage: StageSpec): ModelTier | undefined {
  return stage.tier;
}
