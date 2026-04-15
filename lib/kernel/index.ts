/**
 * Nova Kernel — Public API
 *
 * This is the ONLY import path for callers. Everything else in
 * lib/kernel/ is internal. Keeping a single public surface means we
 * can refactor internals without touching 50 call sites.
 */

export type {
  KernelContext,
  KernelRequest,
  KernelResponse,
  KernelMessage,
  TraceEvent,
  ToolDefinition,
  ToolResult,
  MemoryEntry,
  ModelTier,
} from './types';

export { run, stream } from './runtime';
export { registerTool, getTool, listTools } from './tools/registry';
export { BUILTIN_TOOL_NAMES } from './tools';
export type { BuiltinToolName } from './tools';
export { loadTrace, listTraces } from './trace';
export { recordMemory, loadRelevantMemories, formatMemoriesForPrompt } from './memory';
export { route, computeCostUsd, modelProfile } from './router';
