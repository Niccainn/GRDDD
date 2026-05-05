/**
 * /api/admin/invites — admin-only.
 *
 * POST { email, cohort? } → mints an Invite, returns { link, expiresAt }.
 *   The caller (admin UI or curl) is responsible for getting the link
 *   to the recipient. If RESEND_API_KEY is configured we also send
 *   an email; otherwise the link is only in the API response.
 *
 * GET → lists recent invites (most-recent-first, capped at 100) so
 *   the admin UI can show "issued / accepted / expired" state.
 *
 * Auth: requireAdmin() — 404 on non-admin, no existence side-channel.
 *
 * This is the only path that can mint an account when public signup
 * is disabled. It is the entire trust boundary between waitlist and
 * production.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin';
import { issueInvite } from '@/lib/auth/invites';
import { rateLimitApi } from '@/lib/rate-limit';
import { sendEmail, isEmailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  const rl = rateLimitApi(admin.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      cohort: true,
      issuedById: true,
    },
  });

  const now = new Date();
  return Response.json({
    invites: invites.map(i => ({
      id: i.id,
      email: i.email,
      cohort: i.cohort,
      issuedAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
      usedAt: i.usedAt?.toISOString() ?? null,
      // Derived state for the UI — saves the client the comparison.
      state: i.usedAt
        ? 'accepted'
        : i.expiresAt < now
          ? 'expired'
          : 'pending',
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const rl = rateLimitApi(admin.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const cohort = typeof body.cohort === 'string' && body.cohort.trim() ? body.cohort.trim() : null;
  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 });
  }

  const issued = await issueInvite({
    email,
    issuedById: admin.id,
    cohort,
  });

  // Best-effort email send. If Resend isn't configured, the admin
  // gets the link in the response and is responsible for delivery.
  let emailSent = false;
  if (isEmailConfigured()) {
    try {
      await sendEmail({
        to: issued.email,
        subject: 'Your GRID invite is ready',
        text: [
          `You're invited to GRID — the workspace that acts.`,
          ``,
          `Open the link below to set up your account. The link is`,
          `single-use and expires on ${issued.expiresAt.toUTCString()}.`,
          ``,
          issued.link,
          ``,
          `If you didn't request this invite, you can ignore this email.`,
        ].join('\n'),
        html: [
          `<p>You're invited to <strong>GRID</strong> — the workspace that acts.</p>`,
          `<p>Open the link below to set up your account. The link is single-use and expires on <code>${issued.expiresAt.toUTCString()}</code>.</p>`,
          `<p><a href="${issued.link}" style="display:inline-block;padding:12px 24px;background:#C8F26B;color:#000;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif">Set up your account</a></p>`,
          `<p style="color:#666;font-size:13px">Or paste this URL into your browser: <br/><code>${issued.link}</code></p>`,
          `<p style="color:#999;font-size:12px">If you didn't request this invite, you can ignore this email.</p>`,
        ].join(''),
      });
      emailSent = true;
    } catch (e) {
      // Don't fail the API call — the link is in the response and
      // the admin can still deliver it manually.
      console.error('[admin/invites] sendEmail failed:', e);
    }
  }

  return Response.json({
    id: issued.id,
    email: issued.email,
    cohort,
    expiresAt: issued.expiresAt.toISOString(),
    link: issued.link,
    emailSent,
  });
}
