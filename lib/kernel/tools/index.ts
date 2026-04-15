/**
 * Kernel tool bootstrap.
 *
 * Importing this file triggers registration of every built-in tool.
 * Callers should import this once at app startup (e.g. from the API
 * route that calls the kernel). Plugins added later (connectors, custom
 * enterprise tools) can import the registry directly and register at
 * their own module-load time.
 */

import './system-tools';
import './workflow-tools';
import './goal-tools';
import './signal-tools';
import './activity-tools';

export { getTool, listTools, registerTool, invokeTool, toAnthropicTools } from './registry';

/** Canonical list of built-in tool names (what every chat surface exposes by default). */
export const BUILTIN_TOOL_NAMES = [
  'list_systems',
  'set_health_score',
  'analyse_cross_system',
  'list_workflows',
  'create_workflow',
  'update_workflow',
  'list_goals',
  'update_goal',
  'create_signal',
  'get_activity',
  'record_memory',
] as const;

export type BuiltinToolName = (typeof BUILTIN_TOOL_NAMES)[number];
