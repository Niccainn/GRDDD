/**
 * Transactional email — env-gated Resend wrapper.
 *
 * If `RESEND_API_KEY` is unset the module becomes a no-op: every send
 * returns `{ ok: true, skipped: true }` and logs a dev-mode breadcrumb.
 * This lets the rest of the app treat email as "best effort, present
 * when configured" without branching on env at every call site.
 *
 * Keeping the dependency-free codepath is deliberate — we don't import
 * the `resend` package at module load, because a CI build without the
 * env var shouldn't require the package to be installed.
 */

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
}

function isEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'Grid <onboarding@resend.dev>';
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!isEnabled()) {
    // Previously this was a silent skip that only printed to stdout.
    // Password-reset flows call sendEmail then the API returns 200
    // (enumeration safety), so the user sees "check your email" and
    // nothing arrives. Log to AppError so ops can see the backlog
    // without breaking the enumeration property.
    // eslint-disable-next-line no-console
    console.log('[email] skipped (RESEND_API_KEY unset):', args.subject, '→', args.to);
    await logEmailFailure({
      reason: 'unconfigured',
      subject: args.subject,
      toDomain: extractDomain(args.to),
    });
    return { ok: true, skipped: true };
  }

  try {
    // Dynamic import so the package is only required when the env var
    // is actually set — keeps the CI build hermetic.
    const { Resend } = await import('resend');
    const client = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await client.emails.send({
      from: fromAddress(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (error) {
      await logEmailFailure({
        reason: 'resend_error',
        subject: args.subject,
        toDomain: extractDomain(args.to),
        message: error.message,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailFailure({
      reason: 'send_threw',
      subject: args.subject,
      toDomain: extractDomain(args.to),
      message,
    });
    return { ok: false, error: message };
  }
}

async function logEmailFailure(data: {
  reason: 'unconfigured' | 'resend_error' | 'send_threw';
  subject: string;
  toDomain: string;
  message?: string;
}): Promise<void> {
  // Deferred import — `logError` pulls in Prisma, and we don't want
  // every import of lib/email to force the DB client to load. In
  // build-time contexts (Next static generation) this keeps the
  // module tree-shakable.
  try {
    const { logError } = await import('./observability/errors');
    await logError({
      scope: 'email',
      level: data.reason === 'unconfigured' ? 'warn' : 'error',
      message: data.message ?? `Email ${data.reason}: ${data.subject}`,
      // Never log the full recipient address — only the domain, so
      // admins can see "deliveries to gmail.com are failing" without
      // leaking who specifically.
      context: { reason: data.reason, subject: data.subject, toDomain: data.toDomain },
    });
  } catch {
    // Observability must never fail the email send. Swallow.
  }
}

function extractDomain(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? 'unknown' : address.slice(at + 1).toLowerCase();
}

export function isEmailConfigured(): boolean {
  return isEnabled();
}
