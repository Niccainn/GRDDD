import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Slack Events API webhook receiver.
 *
 * Handles:
 * - url_verification: Slack challenge handshake
 * - event_callback: Incoming messages → create Signals
 *
 * Setup: Create a Slack App → Event Subscriptions → point to:
 *   https://your-domain.com/api/webhooks/slack
 * Subscribe to: message.channels, message.groups
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Slack URL verification handshake
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Event callback
  if (body.type === 'event_callback') {
    const event = body.event;

    // Only process messages (not bot messages, not edits)
    if (
      event?.type === 'message' &&
      !event.subtype &&
      !event.bot_id &&
      event.text
    ) {
      const channelName = event.channel_name ?? event.channel ?? 'unknown';
      const text = event.text;
      const userId = event.user ?? 'unknown';

      // Determine priority based on content signals
      let priority = 'NORMAL';
      const lowerText = text.toLowerCase();
      if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical')) {
        priority = 'URGENT';
      } else if (lowerText.includes('important') || lowerText.includes('blocker') || lowerText.includes('need help')) {
        priority = 'HIGH';
      }

      // Find the default environment (first one, or Operations if it exists)
      const defaultEnv = await prisma.environment.findFirst({
        where: { slug: 'operations' },
      }) ?? await prisma.environment.findFirst();

      if (!defaultEnv) {
        return Response.json({ ok: false, error: 'No environment found' }, { status: 500 });
      }

      // Create signal
      await prisma.signal.create({
        data: {
          title: `Slack: #${channelName}`,
          body: text.slice(0, 2000),
          source: 'slack',
          sourceRef: `${event.channel}:${event.ts}`,
          priority,
          status: 'UNREAD',
          environmentId: defaultEnv.id,
        },
      });

      return Response.json({ ok: true });
    }
  }

  return Response.json({ ok: true });
}

// Slack also sends GET requests for verification in some setups
export async function GET() {
  return Response.json({
    service: 'GRID Slack Webhook',
    status: 'active',
    instructions: 'POST Slack Events API payloads to this endpoint',
  });
}
