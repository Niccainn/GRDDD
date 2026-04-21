import { NextRequest } from 'next/server';
import { runNovaAgent, type NovaEvent } from '@/lib/nova';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitNovaStrict } from '@/lib/rate-limit';
import { MissingKeyError } from '@/lib/nova/client-factory';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = await rateLimitNovaStrict(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { systemId, input } = await req.json();

  if (!systemId || !input) {
    return new Response(JSON.stringify({ error: 'Missing systemId or input' }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: NovaEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        await runNovaAgent({ systemId, identityId: identity.id, input, onEvent: send });
      } catch (err) {
        if (err instanceof MissingKeyError) {
          send({ type: 'error', message: err.message });
          return;
        }
        send({ type: 'error', message: err instanceof Error ? err.message : 'Nova failed' });
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
