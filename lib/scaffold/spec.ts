/**
 * Scaffold spec — the typed draft produced by Nova from a single prompt.
 *
 * Cellular model:
 *   Environment = the cell
 *   System      = an organelle (specialised function area)
 *   Workflow    = a gene expression pathway (stages → output)
 *   Signal rule = a synaptic receptor (external trigger → internal action)
 *   Widget slot = a visible organelle on the dashboard membrane
 *   Role hint   = proposed staffing, the cell's "cytoskeleton"
 *
 * The spec is draft-only until the user accepts it — nothing writes
 * to the DB while Nova is generating. That's the "review the biopsy
 * before the transplant" rule from BETA_TESTING.md.
 */

import { z } from 'zod';

// ─── Individual organelle shapes ──────────────────────────────────────

const SystemAgentDraft = z.object({
  /** e.g. "Marketing Agent", "Ops Agent". Defaults generated from system name. */
  name: z.string().min(1).max(60),
  /** 1–3 sentence persona: role, priorities, tone. */
  persona: z.string().min(10).max(600),
  /** Tools this agent may invoke. Tight allowlist is safer than broad. */
  toolAllowList: z.array(z.string()).default([]),
  autonomyTier: z
    .enum(['Observe', 'Suggest', 'Act', 'Autonomous', 'Self-Direct'])
    .default('Suggest'),
});

const SystemDraft = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(240),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  /**
   * Short rationale: why this system belongs in the cell. Helps the
   * human reviewer decide whether to accept — surfaced in the widget.
   */
  rationale: z.string().max(200).optional(),
  /** Optional per-system agent — enables the "MarketingAgent" model. */
  agent: SystemAgentDraft.optional(),
});

const WorkflowStageDraft = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  /** What the stage does — becomes the system prompt at run time. */
  instruction: z.string().min(10).max(1000),
  tier: z.enum(['fast', 'balanced', 'deep']).default('balanced'),
  dependsOn: z.array(z.string()).default([]),
  critical: z.boolean().default(false),
  tools: z.array(z.string()).default([]),
});

const WorkflowDraft = z.object({
  name: z.string().min(1).max(80),
  systemName: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  stages: z.array(WorkflowStageDraft).min(1).max(8),
  /**
   * What triggers this workflow. "manual" is always safe — scheduled
   * and signal triggers require the named signal/cron to be present.
   */
  triggers: z.array(z.enum(['manual', 'schedule', 'signal', 'webhook'])).default(['manual']),
});

const SignalRuleDraft = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200),
  sourceHint: z.string().max(40).optional(), // e.g. "slack", "email", "form"
});

const WidgetSlotDraft = z.object({
  widget: z.enum([
    'SystemHealthWidget',
    'WorkflowKanbanWidget',
    'ActivityFeedWidget',
    'AttentionWidget',
    'GoalsWidget',
    'IntegrationsWidget',
    'ROIEffortWidget',
    'MasteryWidget',
    'ReflectiveInsightsWidget',
    'CampaignAnalyticsWidget',
    'LiveScaffoldWidget',
  ]),
  /** Where to place it in the dashboard grid (0 = top-left). */
  order: z.number().int().min(0).max(50),
  /** Why this widget matters for this specific cell. */
  reason: z.string().max(140).optional(),
});

const RoleHintDraft = z.object({
  /** A name or handle from the prompt. Matched to a membership at commit time. */
  personHint: z.string().min(1).max(60),
  role: z.enum(['ADMIN', 'CONTRIBUTOR', 'VIEWER']),
  /** Which system they're primarily responsible for, if any. */
  systemName: z.string().min(1).max(60).optional(),
});

const IntegrationSuggestion = z.object({
  provider: z.string().min(1).max(40),
  why: z.string().max(200),
});

// ─── The full spec ─────────────────────────────────────────────────────

export const ScaffoldSpec = z.object({
  /** Short headline the widget displays while assembling. */
  summary: z.string().min(1).max(200),
  /** "creative_agency", "saas_startup", etc — free-form for now. */
  shape: z.string().min(1).max(60).optional(),
  brandTone: z.string().max(200).optional(),
  brandAudience: z.string().max(200).optional(),
  brandValues: z.string().max(200).optional(),

  systems: z.array(SystemDraft).min(1).max(8),
  workflows: z.array(WorkflowDraft).max(16),
  signals: z.array(SignalRuleDraft).max(10),
  widgets: z.array(WidgetSlotDraft).max(12),
  roles: z.array(RoleHintDraft).max(20),
  integrations: z.array(IntegrationSuggestion).max(10),
});

export type ScaffoldSpec = z.infer<typeof ScaffoldSpec>;
export type SystemDraft = z.infer<typeof SystemDraft>;
export type SystemAgentDraft = z.infer<typeof SystemAgentDraft>;
export type WorkflowDraft = z.infer<typeof WorkflowDraft>;
export type WorkflowStageDraft = z.infer<typeof WorkflowStageDraft>;
export type SignalRuleDraft = z.infer<typeof SignalRuleDraft>;
export type WidgetSlotDraft = z.infer<typeof WidgetSlotDraft>;
export type RoleHintDraft = z.infer<typeof RoleHintDraft>;
export type IntegrationSuggestion = z.infer<typeof IntegrationSuggestion>;

// ─── Static validation helpers ────────────────────────────────────────

/**
 * Referential integrity checks the Zod schema can't express:
 *   - Every workflow.systemName refers to a system in `systems`
 *   - Every stage.dependsOn refers to a stage id that exists in the same workflow
 *   - Every role.systemName (when set) refers to a system in `systems`
 *   - Stage ids are unique within a workflow
 *
 * Returns an array of human-readable errors. Empty array = spec is coherent.
 */
export function validateScaffoldIntegrity(spec: ScaffoldSpec): string[] {
  const errors: string[] = [];
  const systemNames = new Set(spec.systems.map(s => s.name));

  for (const wf of spec.workflows) {
    if (!systemNames.has(wf.systemName)) {
      errors.push(`Workflow "${wf.name}" references unknown system "${wf.systemName}"`);
    }

    const stageIds = new Set<string>();
    for (const stage of wf.stages) {
      if (stageIds.has(stage.id)) {
        errors.push(`Workflow "${wf.name}" has duplicate stage id "${stage.id}"`);
      }
      stageIds.add(stage.id);
    }
    for (const stage of wf.stages) {
      // dependsOn default is applied by Zod; tolerate missing here too
      // so validateScaffoldIntegrity is safe to call on raw input.
      for (const dep of stage.dependsOn ?? []) {
        if (!stageIds.has(dep)) {
          errors.push(
            `Workflow "${wf.name}" stage "${stage.id}" depends on unknown stage "${dep}"`,
          );
        }
        if (dep === stage.id) {
          errors.push(`Workflow "${wf.name}" stage "${stage.id}" depends on itself`);
        }
      }
    }
  }

  for (const role of spec.roles) {
    if (role.systemName && !systemNames.has(role.systemName)) {
      errors.push(
        `Role hint for "${role.personHint}" references unknown system "${role.systemName}"`,
      );
    }
  }

  return errors;
}
