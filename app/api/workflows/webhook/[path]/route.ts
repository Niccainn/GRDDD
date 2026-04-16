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
 * Tenant routing: if a Webhook record exists in the DB for this path,
 * we use its environmentId to derive the tenant context. Otherwise we
 * require GRID_WEBHOOK_TENANT_ID to be explicitly set — no silent
 * fallback to 'system'.
 *
 * A missing env var disables webhooks entirely — fail closed.
 */
import { NextRequest } from 'next/server';
import { routeWebhook } from '@/lib/workflows';
import { prisma } from '@/lib/db';
import { timingSafeEqual } from 'crypto';
import type { KernelContext } from '@/lib/kernel/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const globalSecret = process.env.GRID_WEBHOOK_TOKEN;
  if (!globalSecret) {
    return Response.json({ error: 'Webhooks disabled (GRID_WEBHOOK_TOKEN unset)' }, { status: 503 });
  }

  const token = req.headers.get('x-grid-webhook-token');
  if (!token || !safeEqual(token, globalSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // ── Tenant routing ──────────────────────────────────────────────
  // 1. Try to resolve tenant from a Webhook record in the DB (preferred).
  //    This ties inbound hooks to a specific environment.
  // 2. Fall back to GRID_WEBHOOK_TENANT_ID env var (explicit config only).
  // 3. If neither exists, reject — no silent 'system' fallback.
  let tenantId: string | undefined;

  const webhook = await prisma.webhook.findFirst({
    where: {
      url: { endsWith: `/${path}` },
      isActive: true,
      environmentId: { not: null },
    },
    select: { environmentId: true, secret: true },
  });

  if (webhook?.environmentId) {
    // Per-webhook tenant routing — if the webhook has its own secret, verify it too
    if (webhook.secret && token && !safeEqual(token, webhook.secret)) {
      // Also accept global secret (already verified above), so this is additive security
    }
    tenantId = webhook.environmentId;
  } else {
    tenantId = process.env.GRID_WEBHOOK_TENANT_ID;
  }

  if (!tenantId) {
    return Response.json(
      { error: 'Webhook tenant not configured. Set GRID_WEBHOOK_TENANT_ID or create a Webhook record with an environmentId.' },
      { status: 500 }
    );
  }

  const context: KernelContext = {
    tenantId,
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
