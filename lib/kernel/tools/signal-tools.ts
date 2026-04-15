/**
 * Kernel tools — Signals
 *
 * `create_signal` is special: every signal Nova creates is immediately
 * offered to the workflow reactive layer via `routeSignal`. Any
 * WorkflowSpec whose trigger matches `{source, minPriority}` fires in
 * the background. This is how GRID closes the autonomous loop:
 *
 *   observation → signal → reaction → outcome → memory → next observation
 *
 * The fan-out is fire-and-forget relative to the tool caller so the
 * kernel doesn't wait on downstream workflow execution. Failures in
 * reactive workflows are logged but never bubble up to the tool result.
 */

import { prisma } from '../../db';
import { registerTool } from './registry';
import { routeSignal } from '../../workflows/triggers/signal';

registerTool({
  name: 'create_signal',
  description:
    'Route a new signal (task, request, or alert) into the inbox for triage or direct system routing.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
      priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      targetSystemId: {
        type: 'string',
        description: 'System to route to (defaults to current system)',
      },
    },
    required: ['title'],
  },
  capabilities: ['write'],
  async handler(args, ctx) {
    const a = args as {
      title: string;
      body?: string;
      priority?: string;
      targetSystemId?: string;
    };
    if (!ctx.environmentId) {
      return { ok: false, summary: 'No environment scope', error: 'environmentId required' };
    }
    const signal = await prisma.signal.create({
      data: {
        title: a.title,
        body: a.body ?? null,
        source: 'nova',
        priority: a.priority ?? 'NORMAL',
        environmentId: ctx.environmentId,
        systemId: a.targetSystemId ?? ctx.systemId ?? null,
      },
    });

    // ─── Reactive fan-out ────────────────────────────────────────────
    // Offer this signal to any workflow listening on this source.
    // Fire-and-forget: we don't await so the caller isn't blocked.
    // We DO catch + log so background failures are visible in traces.
    const priority = (signal.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') ?? 'NORMAL';
    routeSignal(
      {
        source: signal.source,
        priority,
        message: signal.title,
        metadata: {
          signalId: signal.id,
          body: signal.body ?? undefined,
          systemId: signal.systemId ?? undefined,
        },
      },
      ctx
    )
      .then((res) => {
        if (res.matched > 0) {
          console.log(
            `[signal.auto-dispatch] signal=${signal.id} matched=${res.matched} runs=${res.runs.length}`
          );
        }
      })
      .catch((err) => {
        console.error('[signal.auto-dispatch] failed', signal.id, err);
      });

    return {
      ok: true,
      summary: `Signal "${signal.title}" created`,
      data: { id: signal.id, title: signal.title, priority: signal.priority },
    };
  },
});
