/**
 * Scaffold environment from a prompt.
 *
 *   POST ?environmentId=…  — streams SSE events as Nova drafts the cell.
 *                            Returns (in the final `validated` event) a
 *                            typed ScaffoldSpec the client can display
 *                            for review. Nothing is persisted here.
 *
 *   PUT  ?environmentId=…  — commits an accepted ScaffoldSpec in one
 *                            transaction: Systems, Workflows + Stages,
 *                            Signals, and the dashboard layout.
 *
 * The two-step flow is the cellular-biopsy rule: draft first, review
 * with a human, THEN transplant. Avoids runaway Nova from polluting
 * a workspace with 8 wrong systems in one click.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { assertCanWriteEnvironment } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { generateScaffold, type ScaffoldEvent } from '@/lib/scaffold/generator';
import { ScaffoldSpec, validateScaffoldIntegrity } from '@/lib/scaffold/spec';

// ─── Helpers ──────────────────────────────────────────────────────────

function sse(event: ScaffoldEvent | { type: 'validated'; spec: unknown }): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ─── POST: stream a draft scaffold ────────────────────────────────────

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  // Write-permission: owners and ADMIN/CONTRIBUTOR can scaffold.
  // VIEWERs cannot mutate. Any miss throws a 404 Response we re-raise.
  try {
    await assertCanWriteEnvironment(environmentId, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Forbidden' }, { status: 404 });
  }

  const { prompt } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
    return Response.json(
      { error: 'Prompt must be at least 10 characters describing the business or team.' },
      { status: 400 },
    );
  }

  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    select: { brandTone: true, brandAudience: true, brandValues: true },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = generateScaffold({
          environmentId,
          prompt: prompt.trim(),
          brandTone: env?.brandTone ?? null,
          brandAudience: env?.brandAudience ?? null,
          brandValues: env?.brandValues ?? null,
        });
        for await (const evt of gen) {
          controller.enqueue(encoder.encode(sse(evt)));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scaffold failed';
        // Never leak stack traces — client gets the short reason only.
        controller.enqueue(encoder.encode(sse({ type: 'error', message: msg, recoverable: false })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ─── PUT: commit an accepted spec ─────────────────────────────────────

export async function PUT(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  try {
    await assertCanWriteEnvironment(environmentId, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Forbidden' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ScaffoldSpec.safeParse(body?.spec);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid spec', issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const spec = parsed.data;

  const integrityErrors = validateScaffoldIntegrity(spec);
  if (integrityErrors.length > 0) {
    return Response.json({ error: 'Integrity failed', issues: integrityErrors }, { status: 400 });
  }

  // One transaction. If any row fails we roll back — partial scaffolds
  // are worse than no scaffold.
  const result = await prisma.$transaction(async (tx) => {
    // 1. Apply brand nucleus overrides (only if not already set — never
    //    clobber existing brand settings).
    await tx.environment.update({
      where: { id: environmentId },
      data: {
        ...(spec.brandTone ? { brandTone: spec.brandTone } : {}),
        ...(spec.brandAudience ? { brandAudience: spec.brandAudience } : {}),
        ...(spec.brandValues ? { brandValues: spec.brandValues } : {}),
      },
    });

    // 2. Systems — one row each. Keep the ID map so workflows can
    //    resolve systemName → systemId.
    const systemIdByName = new Map<string, string>();
    for (const s of spec.systems) {
      const created = await tx.system.create({
        data: {
          name: s.name,
          description: s.description,
          color: s.color ?? null,
          environmentId,
          creatorId: identity.id,
        },
      });
      systemIdByName.set(s.name, created.id);
    }

    // 3. Workflows — one row each, with stages serialized as JSON.
    //    Keep the Workflow model's existing contract (stages stored as
    //    JSON string in the `stages` column, per current schema).
    for (const wf of spec.workflows) {
      const systemId = systemIdByName.get(wf.systemName);
      if (!systemId) continue; // integrity should prevent this, belt & braces
      await tx.workflow.create({
        data: {
          name: wf.name,
          description: wf.description ?? null,
          status: 'DRAFT',
          systemId,
          environmentId,
          creatorId: identity.id,
          stages: JSON.stringify(wf.stages),
        },
      });
    }

    // 4. Signals — lightweight rows for now. The actual
    //    source-matching rules get configured by the user later.
    for (const sig of spec.signals) {
      await tx.signal.create({
        data: {
          title: sig.name,
          body: sig.description,
          priority: 'NORMAL',
          source: sig.sourceHint ?? 'scaffold',
          environmentId,
        },
      });
    }

    return {
      systemsCreated: spec.systems.length,
      workflowsCreated: spec.workflows.length,
      signalsCreated: spec.signals.length,
    };
  });

  return Response.json({
    committed: true,
    ...result,
    widgets: spec.widgets, // returned so the dashboard can save the layout client-side
    roles: spec.roles,
    integrations: spec.integrations,
  });
}
