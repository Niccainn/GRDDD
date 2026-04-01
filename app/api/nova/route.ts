import { NextRequest } from 'next/server';
import { runNovaAgent, type NovaEvent } from '@/lib/nova';

export async function POST(req: NextRequest) {
  const { systemId, input } = await req.json();

  if (!systemId || !input) {
    return new Response(JSON.stringify({ error: 'Missing systemId or input' }), { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: NovaEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        await runNovaAgent({ systemId, input, onEvent: send });
      } catch (err) {
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
