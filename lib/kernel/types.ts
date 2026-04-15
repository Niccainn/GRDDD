/**
 * Nova Kernel — core types
 *
 * The kernel is the model-agnostic runtime that every intelligent feature
 * in GRID sits on top of. Everything that "thinks" — Nova chat, workflow
 * execution, predictive signals, cross-environment reasoning — flows
 * through this kernel so we get:
 *
 *   1. One structured trace format (observability)
 *   2. One place to route between models (cost optimization)
 *   3. One place to plug in tools (extensibility)
 *   4. One place to inject per-tenant learned behaviors (memory)
 */

// ─── Model tiers ─────────────────────────────────────────────────────────────

export type ModelTier = 'fast' | 'balanced' | 'deep';

/**
 * ModelTier maps to concrete Anthropic models in router.ts.
 * The kernel never references raw model names — callers ask for a tier
 * based on the task complexity and the router picks the cheapest model
 * that can do the job.
 */
export const MODEL_TIER_DESCRIPTIONS: Record<ModelTier, string> = {
  fast: 'Classification, routing, short answers, simple extraction',
  balanced: 'Drafting, tool-using agentic loops, workflow stages',
  deep: 'Strategic reasoning, multi-step planning, cross-environment synthesis',
};

// ─── Request / Response ──────────────────────────────────────────────────────

export interface KernelContext {
  /** Tenant ID — every kernel call is scoped to one tenant. */
  tenantId: string;
  /** Optional environment scope (many tools resolve against this). */
  environmentId?: string;
  /** Optional system scope. */
  systemId?: string;
  /** The human or service initiating the call (for audit trail). */
  actorId: string;
  /** Surface that triggered this — chat, workflow, scheduler, webhook, api. */
  surface: 'chat' | 'workflow' | 'scheduler' | 'webhook' | 'api' | 'pattern';
}

export interface KernelRequest {
  context: KernelContext;
  /** Preferred tier; router may downgrade for cost or upgrade for complexity. */
  tier?: ModelTier;
  /** System prompt identifier (versioned in prompts/) or inline override. */
  systemPrompt: string;
  /** Conversation history — user/assistant turns. */
  messages: KernelMessage[];
  /** Tool names to expose (must be registered). Empty = no tools. */
  tools?: string[];
  /** Maximum tool-use iterations in the agentic loop. */
  maxIterations?: number;
  /** Hard cap on output tokens. */
  maxTokens?: number;
  /** If true, stream events via the returned async iterator. */
  stream?: boolean;
}

export interface KernelMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KernelResponse {
  text: string;
  traceId: string;
  tokens: { input: number; output: number; total: number };
  costUsd: number;
  modelUsed: string;
  toolCalls: number;
  durationMs: number;
}

// ─── Trace events (what flows through the stream) ───────────────────────────

export type TraceEvent =
  | { type: 'start'; traceId: string; tier: ModelTier; model: string; timestamp: number }
  | { type: 'thinking'; timestamp: number }
  | { type: 'reasoning'; text: string; timestamp: number }
  | { type: 'tool_call'; toolName: string; args: unknown; callId: string; timestamp: number }
  | { type: 'tool_result'; callId: string; ok: boolean; summary: string; durationMs: number; timestamp: number }
  | { type: 'text_delta'; text: string; timestamp: number }
  | { type: 'warning'; code: string; message: string; timestamp: number }
  | { type: 'done'; response: KernelResponse; timestamp: number }
  | { type: 'error'; message: string; recoverable: boolean; timestamp: number };

// ─── Tool contract ──────────────────────────────────────────────────────────

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  /** JSON schema for input validation and model exposure. */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /**
   * The tools can be tagged by capability so the kernel can filter them
   * per surface (e.g. scheduler can't trigger another workflow).
   */
  capabilities?: Array<'read' | 'write' | 'execute' | 'cross_env'>;
  /** Minimum tier required to use this tool (deep tools = deep tier). */
  minTier?: ModelTier;
  /** Handler — runs in tenant scope, gets context + validated args. */
  handler: (args: TArgs, ctx: KernelContext) => Promise<ToolResult<TResult>>;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  /** Short, human-readable summary shown in trace UI. */
  summary: string;
  /** Structured payload returned to the model. */
  data?: T;
  /** Error message if !ok. */
  error?: string;
}

// ─── Memory (per-tenant learned behaviors) ──────────────────────────────────

export interface MemoryEntry {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  /** What kind of learned fact: preference, pattern, outcome, caveat. */
  kind: 'preference' | 'pattern' | 'outcome' | 'caveat';
  /** How confident the kernel is in this memory (0-1). */
  confidence: number;
  /** How many times this memory has been reinforced. */
  reinforcements: number;
  createdAt: Date;
  lastUsedAt?: Date;
}
