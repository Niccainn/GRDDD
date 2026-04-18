import { prisma } from './db';
import crypto from 'crypto';

export type WebhookEvent =
  | 'execution.completed'
  | 'execution.failed'
  | 'automation.run'
  | 'alert.critical'
  | 'alert.warning'
  | 'workflow.activated'
  | 'workflow.paused';

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

/**
 * Fires all active webhooks subscribed to the given event.
 * Non-blocking — fires and forgets in the background.
 */
export async function fireWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>,
  environmentId: string
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        environmentId,
      },
    });

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const body = JSON.stringify(payload);

    for (const webhook of webhooks) {
      const events: string[] = JSON.parse(webhook.events ?? '[]');
      if (!events.includes(event)) continue;

      const start = Date.now();
      let status: number | null = null;
      let success = false;
      let error: string | null = null;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-GRID-Event': event,
          'X-GRID-Timestamp': payload.timestamp,
        };

        // HMAC signature if secret configured
        if (webhook.secret) {
          const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
          headers['X-GRID-Signature'] = `sha256=${sig}`;
        }

        // SSRF defense in depth — validate resolution right before
        // dispatch so DNS rebinding is caught even if the stored URL
        // was legal at save time.
        const { resolveAndValidate, SsrfBlockedError } = await import('@/lib/security/ssrf');
        await resolveAndValidate(webhook.url);
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout
          redirect: 'manual', // don't let redirects chain into private space
        });
        status = res.status;
        success = res.ok;
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.name === 'SsrfBlockedError') {
          error = 'URL blocked by SSRF policy';
          status = 0;
        } else {
          error = err instanceof Error ? err.message : 'Unknown error';
        }
      }

      // Log delivery (fire and forget — don't await)
      prisma.webhookDelivery.create({
        data: {
          event,
          payload: body,
          status,
          success,
          error,
          duration: Date.now() - start,
          webhookId: webhook.id,
        },
      }).catch(() => { /* ignore logging errors */ });
    }
  } catch {
    // Webhook errors must never crash the main request
  }
}
