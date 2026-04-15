/**
 * Signal trigger — reactive workflow dispatch on internal events.
 *
 * Signals are GRID\'s internal event bus: something happened (a health
 * score dropped, a goal slipped, a pattern matched) and one or more
 * workflows should react. This file is the dispatcher — it looks at
 * every spec with a signal trigger and fires the ones whose `source`
 * (and optional minPriority) match the incoming signal.
 *
 * The synergy angle: signal-triggered workflows close the loop
 * between passive observation and active response, without a human
 * in the critical path. Humans still approve outcomes (via stage
 * `requiresApproval`) — they just aren\'t the gatekeeper for noticing.
 */

import { listWorkflows } from '../marketplace';
import { dispatch } from '../scheduler';
import type { KernelContext } from '../../kernel/types';
import type { RunResult } from '../engine';

export interface SignalEvent {
  source: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SignalDispatchResult {
  matched: number;
  runs: RunResult[];
}

const PRIORITY_RANK: Record<SignalEvent['priority'], number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

export async function routeSignal(
  event: SignalEvent,
  context: KernelContext
): Promise<SignalDispatchResult> {
  const specs = listWorkflows({ triggerType: 'signal' }).filter((s) => {
    if (s.trigger.type !== 'signal') return false;
    if (s.trigger.source !== event.source) return false;
    if (s.trigger.minPriority) {
      return PRIORITY_RANK[event.priority] >= PRIORITY_RANK[s.trigger.minPriority];
    }
    return true;
  });

  if (specs.length === 0) return { matched: 0, runs: [] };

  const input = JSON.stringify({
    source: event.source,
    priority: event.priority,
    message: event.message,
    metadata: event.metadata ?? {},
  });

  const runs = await Promise.all(
    specs.map((spec) =>
      dispatch({
        spec,
        input,
        context: { ...context, surface: 'webhook' }, // signals are treated like webhooks from the kernel\'s POV
      })
    )
  );

  return { matched: specs.length, runs };
}
