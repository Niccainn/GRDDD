/**
 * Workflows — public API.
 *
 * Every consumer of the workflow primitive (API routes, UI, connectors,
 * tests) imports from this file. Nothing else in the workflows module
 * should be imported directly from outside the module.
 *
 *   import {
 *     // types
 *     type WorkflowSpec, type WorkflowTrigger, type StageSpec,
 *     type RunResult, type StageResult,
 *
 *     // marketplace
 *     getWorkflow, listWorkflows, registerWorkflow, summarize,
 *     availableCategories, type WorkflowSummary,
 *
 *     // execution
 *     execute, dispatch,
 *
 *     // scheduling
 *     tick, shouldFire, cronMatches,
 *
 *     // reactive triggers
 *     routeWebhook, routeSignal,
 *
 *     // authoring
 *     parseSpec, safeParseSpec, SPEC_SCHEMA_VERSION,
 *   } from "@/lib/workflows";
 */

export {
  // Spec types
  type WorkflowSpec,
  type WorkflowTrigger,
  type StageSpec,
  SPEC_SCHEMA_VERSION,
  parseSpec,
  safeParseSpec,
  topoSortStages,
  interpolateInstruction,
  specToolCount,
  specDepth,
} from './spec';

export {
  execute,
  type RunResult,
  type StageResult,
  type ExecuteOptions,
} from './engine';

export {
  dispatch,
  tick,
  shouldFire,
  cronMatches,
  type TriggerContext,
  type TickParams,
  type TickResult,
} from './scheduler';

export {
  getWorkflow,
  hasWorkflow,
  listWorkflows,
  registerWorkflow,
  unregisterWorkflow,
  summarize,
  availableCategories,
  type WorkflowSummary,
  type MarketplaceFilter,
} from './marketplace';

export {
  routeWebhook,
  routeSignal,
  type WebhookRouteResult,
  type SignalEvent,
  type SignalDispatchResult,
} from './triggers';

// Templates are re-exported for introspection / tests. Tenants access
// them through getWorkflow/listWorkflows, not directly.
export { templates as builtinTemplates } from './templates';
