import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createHmac, timingSafeEqual } from 'crypto';
import { logWebhookSignatureFailure } from '@/lib/webhook-log';

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
 *
 * Security: Validates requests using the Slack Signing Secret.
 * Set SLACK_SIGNING_SECRET in your environment variables.
 */

function verifySlackSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false; // No secret configured — reject all requests

  const timestamp = req.headers.get('x-slack-request-timestamp');
  const slackSignature = req.headers.get('x-slack-signature');
  if (!timestamp || !slackSignature) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = 'v0=' + createHmac('sha256', secret).update(sigBasestring).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // URL verification doesn't need signature check (Slack sends it
  // before the signing secret is confirmed), but all other events do.
  if (body.type !== 'url_verification') {
    if (!verifySlackSignature(req, rawBody)) {
      logWebhookSignatureFailure({
        provider: 'slack',
        path: '/api/webhooks/slack',
        req,
        rawBody,
        reason: 'verifySlackSignature returned false',
      });
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

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
