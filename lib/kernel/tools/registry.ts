/**
 * Nova Kernel — Tool Registry
 *
 * A pluggable tool registry. Tools are registered once at module load,
 * and the kernel asks the registry for tools by name at request time.
 * This means:
 *
 *   1. Adding a new tool = one file + one register() call
 *   2. The kernel never imports concrete tools (zero coupling)
 *   3. Different surfaces can expose different tool subsets
 *   4. Connectors (Phase 4) plug in as tools via the same interface
 */

import type { ToolDefinition, ToolResult, KernelContext, ModelTier } from '../types';

const registry = new Map<string, ToolDefinition>();

export function registerTool<TArgs, TResult>(tool: ToolDefinition<TArgs, TResult>) {
  if (registry.has(tool.name)) {
    // eslint-disable-next-line no-console
    console.warn(`[tool.registry] overwriting existing tool: ${tool.name}`);
  }
  registry.set(tool.name, tool as unknown as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function listTools(filter?: {
  names?: string[];
  minTier?: ModelTier;
  excludeWrite?: boolean;
}): ToolDefinition[] {
  const all = Array.from(registry.values());
  return all.filter((t) => {
    if (filter?.names && !filter.names.includes(t.name)) return false;
    if (filter?.excludeWrite && t.capabilities?.includes('write')) return false;
    return true;
  });
}

/**
 * Invoke a tool by name with runtime validation. This is the one
 * entry point the kernel uses for tool execution — it handles
 * validation, error wrapping, and timing.
 */
export async function invokeTool(
  name: string,
  args: unknown,
  ctx: KernelContext
): Promise<{ result: ToolResult; durationMs: number }> {
  const tool = registry.get(name);
  const startedAt = Date.now();

  if (!tool) {
    return {
      durationMs: Date.now() - startedAt,
      result: {
        ok: false,
        summary: `Unknown tool: ${name}`,
        error: `No tool registered with name "${name}"`,
      },
    };
  }

  try {
    const result = await tool.handler(args, ctx);
    return { result, durationMs: Date.now() - startedAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      durationMs: Date.now() - startedAt,
      result: {
        ok: false,
        summary: `${name} threw`,
        error: msg,
      },
    };
  }
}

/**
 * Convert registered tools into the Anthropic tool format for the API.
 */
export function toAnthropicTools(names: string[]): Array<{
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}> {
  return names
    .map((n) => registry.get(n))
    .filter((t): t is ToolDefinition => Boolean(t))
    .map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
}

export function clearRegistry() {
  registry.clear();
}
