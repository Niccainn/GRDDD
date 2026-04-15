/**
 * POST /api/workflows/webhook/:path
 *
 * Inbound webhook dispatcher. Any external system (Stripe, a signup
 * form, a Slack command, a Linear issue hook) can POST here and every
 * WorkflowSpec whose trigger matches will be dispatched in parallel.
 *
 * Auth model: webhooks are not tied to a user session (they come from
 * third parties). They are gated by a shared secret header:
 *   X-Grid-Webhook-Token: <process.env.GRID_WEBHOOK_TOKEN>
 *
 * A missing env var disables webhooks entirely — fail closed.
 */
import { NextRequest } from 'next/server';
import { routeWebhook } from '@/lib/workflows';
import type { KernelContext } from '@/lib/kernel/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const secret = process.env.GRID_WEBHOOK_TOKEN;
  if (!secret) {
    return Response.json({ error: 'Webhooks disabled (GRID_WEBHOOK_TOKEN unset)' }, { status: 503 });
  }

  const token = req.headers.get('x-grid-webhook-token');
  if (token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Webhooks need a synthetic tenant context. For MVP we use a shared
  // system actor; multi-tenant routing will arrive in Phase 3 via a
  // per-tenant webhook path prefix.
  const context: KernelContext = {
    tenantId: process.env.GRID_WEBHOOK_TENANT_ID ?? 'system',
    actorId: 'webhook',
    surface: 'webhook',
  };

  const result = await routeWebhook(path, body, context);
  return Response.json({
    matched: result.matched,
    runs: result.runs.map((r) => ({
      slug: r.spec.slug,
      status: r.status,
      stages: r.stages.length,
      totalTokens: r.totalTokens,
      totalCostUsd: r.totalCostUsd,
      totalDurationMs: r.totalDurationMs,
    })),
  });
}
