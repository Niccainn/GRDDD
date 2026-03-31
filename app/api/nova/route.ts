import { NextRequest } from 'next/server';
import { runNova, finalizeNova } from '@/lib/nova';

export async function POST(req: NextRequest) {
  const { systemId, input } = await req.json();

  if (!systemId || !input) {
    return new Response(JSON.stringify({ error: 'Missing systemId or input' }), { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
  }

  const { stream, intelligence, identity, execution } = await runNova({ systemId, input });

  const encoder = new TextEncoder();
  let fullOutput = '';

  const readable = new ReadableStream({
    async start(controller) {
      stream.on('text', (text) => {
        fullOutput += text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      });

      stream.on('finalMessage', async (message) => {
        await finalizeNova({
          executionId: execution.id,
          systemId,
          intelligenceId: intelligence.id,
          identityId: identity.id,
          input,
          output: fullOutput,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, executionId: execution.id })}\n\n`)
        );
        controller.close();
      });

      stream.on('error', async (error) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
        controller.close();
      });
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
