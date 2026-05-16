import { NextRequest } from 'next/server';
import { runAtriumAgent, type AtriumEvent } from '@/lib/atrium';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitAtriumStrict } from '@/lib/rate-limit';
import { MissingKeyError } from '@/lib/atrium/client-factory';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = await rateLimitAtriumStrict(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { systemId, input } = await req.json();

  if (!systemId || !input) {
    return new Response(JSON.stringify({ error: 'Missing systemId or input' }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: AtriumEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        await runAtriumAgent({ systemId, identityId: identity.id, input, onEvent: send });
      } catch (err) {
        if (err instanceof MissingKeyError) {
          send({ type: 'error', message: err.message });
          return;
        }
        send({ type: 'error', message: err instanceof Error ? err.message : 'Atrium failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
