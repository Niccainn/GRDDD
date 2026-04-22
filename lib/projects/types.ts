/**
 * Project primitive — a multi-day, multi-tool initiative Nova runs
 * with human checkpoints.
 *
 * A Project is persisted as a regular Execution on a lightweight
 * Workflow created on the fly. `Execution.output` (JSON) stores the
 * structured Project state so we don't need a schema migration.
 *
 * The layering:
 *
 *   Project  ──── stored in Execution.output as { kind:'project', ... }
 *     ├── plan:       Step[]
 *     ├── artifacts:  Artifact[]    ← deep links back to Figma/Canva/etc
 *     └── trace:      TraceEntry[]  ← Zapier-style run log
 *
 * Steps carry their own status so the trace view can surface exactly
 * where the work is right now and what is waiting on a human.
 */

export type StepStatus =
  | 'pending'        // not started
  | 'running'        // Nova is executing this step right now
  | 'needs_approval' // waiting on human sign-off
  | 'done'
  | 'skipped'
  | 'failed';

export type ToolSlug =
  | 'figma'
  | 'canva'
  | 'adobe'
  | 'notion'
  | 'slack'
  | 'gmail'
  | 'google_calendar'
  | 'google_drive'
  | 'meta_ads'
  | 'linkedin_ads'
  | 'google_ads'
  | 'stripe'
  | 'hubspot'
  | 'attio'
  | 'linear'
  | 'github'
  | 'claude'     // pure LLM reasoning, no external tool
  | 'human';     // explicit human-only step

export type Artifact = {
  id: string;
  name: string;
  kind: 'file' | 'link' | 'campaign' | 'document' | 'email' | 'post' | 'other';
  tool: ToolSlug;
  /** Deep link back to the tool where the artifact lives. */
  url: string | null;
  thumbnail?: string | null;
  createdAt: string;
};

export type ApprovalGate = {
  approvalRequestId: string | null;
  required: true;
  reason: string;
};

export type Step = {
  id: number; // 1-indexed for readability
  title: string;
  /** Why this step — shown inline so the trace reads like a memo. */
  rationale: string;
  /**
   * Legacy fields — kept so existing projects still render. New
   * projects carry the richer `classifier` tuple below. Executor
   * dispatch prefers `classifier` when present.
   */
  tool: ToolSlug;
  action: string;
  /**
   * The four-dimensional classifier. Present on projects created
   * after the taxonomy landed; absent on legacy projects where we
   * fall back to (tool, action). See lib/skills/taxonomy.ts.
   */
  classifier?: {
    location: string;
    action: string;
    interaction: string;
    execution: string;
  };
  status: StepStatus;
  /** Inputs Claude used. Shown in the expanded trace. */
  inputs?: Record<string, unknown>;
  /** What the step produced — feeds the artifacts list. */
  outputs?: Record<string, unknown>;
  artifactIds?: string[];
  approval?: ApprovalGate;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

export type TraceEntry = {
  at: string;
  stepId: number | null;
  source: 'nova' | 'human' | 'system';
  message: string;
};

export type Project = {
  kind: 'project';
  version: 1;
  id: string;              // mirrors the Execution id
  goal: string;            // natural language goal
  status: 'planning' | 'running' | 'paused' | 'awaiting_approval' | 'done' | 'failed';
  environmentId: string;
  systemId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: Step[];
  artifacts: Artifact[];
  trace: TraceEntry[];
  /** Which step is currently "live" (index into plan). */
  cursor: number;
};

export function emptyTrace(now: string, message: string): TraceEntry {
  return { at: now, stepId: null, source: 'nova', message };
}
