/**
 * GET /api/onboarding/build-stream?wedge=<wedgeId>
 *
 * Server-sent events. Streams Nova's "construction" narration as
 * the System + Workflow are created. Pre-warmed templates — the
 * DB writes happen in one call; the stream paces the lines out
 * for the hero moment. Honest theatre.
 *
 * Events:
 *   data: {"type":"step","text":"Creating System: ..."}
 *   data: {"type":"done","systemId":"...","environmentId":"..."}
 *   data: {"type":"error","message":"..."}
 */
import { getAuthIdentity } from '@/lib/auth';
import { wedgeById, type WedgeId } from '@/app/welcome/wedges';
import { buildSystemForWedge } from '@/lib/onboarding/build-system';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STEP_DELAY_MS = 600;

export async function GET(req: Request) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const wedgeId = searchParams.get('wedge') as WedgeId | null;
  const wedge = wedgeId ? wedgeById(wedgeId) : undefined;

  if (!wedge) {
    return Response.json({ error: 'Unknown wedge' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        // Kick off the DB write immediately; it'll finish fast. We pace
        // the narration regardless so the user sees agency at work.
        const buildPromise = buildSystemForWedge(identity.id, identity.name ?? null, wedge.id);

        for (const text of wedge.buildSteps) {
          send({ type: 'step', text });
          await new Promise(r => setTimeout(r, STEP_DELAY_MS));
        }

        const result = await buildPromise;
        send({ type: 'done', systemId: result.systemId, environmentId: result.environmentId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Build failed';
        send({ type: 'error', message });
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
    },
  });
}
