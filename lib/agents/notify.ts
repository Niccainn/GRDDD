/**
 * Agent approval notification — fire-and-forget email to the agent's
 * creator when a run pauses at AWAITING_APPROVAL. If email is not
 * configured (RESEND_API_KEY unset) this is a no-op.
 *
 * The notification includes:
 *   - The agent name + environment
 *   - A one-line summary of each pending action
 *   - A direct link to the agent detail page where the user can
 *     approve/reject
 *
 * Best effort: never throws, never blocks the run. The caller fires
 * this after persisting PendingAction rows so the data is durable
 * even if the email fails.
 */

import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function notifyApprovalNeeded(params: {
  runId: string;
  agentId: string;
  agentName: string;
  environmentName: string;
  summaries: string[];
  creatorId: string;
}): Promise<void> {
  try {
    const creator = await prisma.identity.findUnique({
      where: { id: params.creatorId },
      select: { email: true, name: true },
    });
    if (!creator?.email) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const agentUrl = `${baseUrl}/agents/${params.agentId}`;

    const actionList = params.summaries
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');

    const actionListHtml = params.summaries
      .map((s) => `<li style="margin-bottom:4px;">${escapeHtml(s)}</li>`)
      .join('');

    await sendEmail({
      to: creator.email,
      subject: `Action needed: ${params.agentName} is waiting for approval`,
      text: [
        `Your agent "${params.agentName}" (${params.environmentName}) has paused and needs your approval.`,
        '',
        'Proposed actions:',
        actionList,
        '',
        `Review and decide: ${agentUrl}`,
      ].join('\n'),
      html: `
        <div style="font-family:system-ui,sans-serif;color:#e0e0e0;background:#111;padding:32px;border-radius:12px;">
          <h2 style="font-weight:300;margin:0 0 8px;">Approval needed</h2>
          <p style="color:#999;font-size:14px;margin:0 0 20px;">
            <strong>${escapeHtml(params.agentName)}</strong> &middot; ${escapeHtml(params.environmentName)}
          </p>
          <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#F59E0B;margin:0 0 8px;">Proposed actions</p>
            <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#ccc;">
              ${actionListHtml}
            </ul>
          </div>
          <a href="${agentUrl}" style="display:inline-block;padding:10px 20px;background:rgba(21,173,112,0.15);border:1px solid rgba(21,173,112,0.4);border-radius:8px;color:#15AD70;text-decoration:none;font-size:14px;">
            Review &amp; decide
          </a>
        </div>
      `,
    });
  } catch {
    // Best effort — swallow all failures.
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
