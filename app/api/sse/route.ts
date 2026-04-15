import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/sse/connections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const connectionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      addConnection(connectionId, identity.id, controller);

      // Send initial connected event
      const welcome = `event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`;
      controller.enqueue(encoder.encode(welcome));

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          removeConnection(connectionId);
        }
      }, 30_000);

      // Clean up when the stream is cancelled (client disconnects)
      const cleanup = () => {
        clearInterval(heartbeat);
        removeConnection(connectionId);
      };

      // Store cleanup for cancel
      (controller as unknown as Record<string, () => void>).__cleanup = cleanup;
    },
    cancel() {
      removeConnection(connectionId);
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
