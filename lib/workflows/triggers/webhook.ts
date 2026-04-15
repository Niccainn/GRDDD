/**
 * Webhook trigger — maps inbound POSTs to workflow executions.
 *
 * Flow:
 *   POST /api/workflows/webhook/:path   (handled in app/api)
 *     → routeWebhook(path)              (this file)
 *     → finds every spec with trigger.type === "webhook" && trigger.path === path
 *     → dispatches them in parallel with the request body as `input`
 *
 * Design notes:
 *   - Multiple specs can listen on the same path (fan-out).
 *   - The body is passed as raw JSON string; stages decide how to parse.
 *   - Idempotency + replay protection belong in the API route, not here.
 */

import { listWorkflows } from '../marketplace';
import { dispatch } from '../scheduler';
import type { KernelContext } from '../../kernel/types';
import type { RunResult } from '../engine';

export interface WebhookRouteResult {
  matched: number;
  runs: RunResult[];
}

export async function routeWebhook(
  path: string,
  body: unknown,
  context: KernelContext
): Promise<WebhookRouteResult> {
  const specs = listWorkflows({ triggerType: 'webhook' }).filter(
    (s) => s.trigger.type === 'webhook' && s.trigger.path === path
  );

  if (specs.length === 0) return { matched: 0, runs: [] };

  const input = typeof body === 'string' ? body : JSON.stringify(body ?? {});

  const runs = await Promise.all(
    specs.map((spec) =>
      dispatch({
        spec,
        input,
        context: { ...context, surface: 'webhook' },
      })
    )
  );

  return { matched: specs.length, runs };
}
