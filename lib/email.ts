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
    // eslint-disable-next-line no-console
    console.log('[email] skipped (RESEND_API_KEY unset):', args.subject, '→', args.to);
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
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isEmailConfigured(): boolean {
  return isEnabled();
}
