/**
 * POST /api/workflows/marketplace/:slug/run
 *
 * Execute a workflow spec end-to-end, streaming per-stage progress
 * back to the caller as Server-Sent Events.
 *
 * Body: { input?: string }  — optional user-supplied input string
 *
 * Event stream (SSE):
 *   data: {"type":"stage_start","stageId":"scan","stageName":"Scan yesterday"}
 *   data: {"type":"stage_end","result":{...StageResult}}
 *   data: {"type":"done","run":{...RunResult}}
 *   data: {"type":"error","message":"..."}
 *
 * Why SSE: workflows can take 30+ seconds across many stages. A single
 * request/response hides progress for far too long — remote teams need
 * to SEE the OS working on their behalf.
 */
import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { getWorkflow, execute, type StageResult, type RunResult } from '@/lib/workflows';
import type { KernelContext } from '@/lib/kernel/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const spec = getWorkflow(slug);
  if (!spec) {
    return Response.json({ error: 'Workflow not found' }, { status: 404 });
  }

  let body: { input?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const input = body.input ?? '';

  const context: KernelContext = {
    tenantId: identity.id,
    actorId: identity.id,
    surface: 'workflow',
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        emit({ type: 'run_start', slug: spec.slug, name: spec.name, stageCount: spec.stages.length });

        let lastStartedId: string | null = null;
        const onStage = (result: StageResult) => {
          // Emit start-implied event when a new stage id appears
          if (lastStartedId !== result.stageId) {
            emit({
              type: 'stage_start',
              stageId: result.stageId,
              stageName: result.stageName,
            });
            lastStartedId = result.stageId;
          }
          emit({ type: 'stage_end', result });
        };

        const runResult: RunResult = await execute(spec, input, context, { onStage });
        emit({ type: 'done', run: runResult });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[workflows.run]', slug, err);
        emit({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
