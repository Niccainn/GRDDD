/**
 * Webhook signature failure logging (SEC-08).
 *
 * Single-purpose helper so every webhook receiver logs identical
 * context when a signature check fails: provider, path, client IP,
 * body-hash (never the raw body), timestamp. A single IP that trips
 * this repeatedly is a strong attack signal — the log gives ops
 * something to alert on.
 */
import { createHash } from 'crypto';

/** Extract client IP from a Next.js Request. */
export function clientIpFrom(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Log a webhook signature failure. Emits one JSON line to stderr
 * with a stable shape so downstream log shippers (Vercel → Datadog /
 * Sentry / ops channel) can key on `event: "webhook_sig_fail"` for
 * dashboards and alert rules.
 *
 * Body is never logged directly — only a sha256 hash. That way a
 * storm of failures still produces searchable logs without leaking
 * the payload.
 */
export function logWebhookSignatureFailure(args: {
  provider: string;
  path: string;
  req: Request;
  rawBody: string;
  reason?: string;
}): void {
  const { provider, path, req, rawBody, reason } = args;
  const bodyHash = createHash('sha256').update(rawBody).digest('hex').slice(0, 16);
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({
      event: 'webhook_sig_fail',
      provider,
      path,
      ip: clientIpFrom(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 120) ?? null,
      bodyHashPrefix: bodyHash,
      bodySize: rawBody.length,
      reason: reason?.slice(0, 200) ?? null,
      at: new Date().toISOString(),
    }),
  );
}
