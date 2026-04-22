import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './db';
import { sendEmail, isEmailConfigured } from './email';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^(https?:\/\/)?/, 'https://') ||
    'http://localhost:3000'
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function issueInvitation({
  email,
  role,
  environmentId,
  environmentName,
  inviterName,
  inviterId,
}: {
  email: string;
  role: string;
  environmentId: string;
  environmentName: string;
  inviterName: string;
  inviterId: string;
}): Promise<{ token: string; invitation: { id: string } }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  // Upsert: if the same email was already invited to this env, refresh the token.
  const existing = await prisma.environmentInvitation.findFirst({
    where: { environmentId, email: email.toLowerCase(), acceptedAt: null },
    select: { id: true },
  });

  let invitation: { id: string };
  if (existing) {
    invitation = await prisma.environmentInvitation.update({
      where: { id: existing.id },
      data: { tokenHash: hashToken(token), expiresAt, role },
      select: { id: true },
    });
  } else {
    invitation = await prisma.environmentInvitation.create({
      data: {
        email: email.toLowerCase(),
        role,
        tokenHash: hashToken(token),
        expiresAt,
        environmentId,
        inviterId,
      },
      select: { id: true },
    });
  }

  await sendInvitationEmail({ email, token, environmentName, inviterName, role });
  return { token, invitation };
}

async function sendInvitationEmail({
  email, token, environmentName, inviterName, role,
}: {
  email: string;
  token: string;
  environmentName: string;
  inviterName: string;
  role: string;
}) {
  const link = `${appUrl()}/invite/${encodeURIComponent(token)}`;
  const roleCopy = role === 'ADMIN' ? 'admin' : role === 'CONTRIBUTOR' ? 'contributor' : 'viewer';

  if (!isEmailConfigured()) {
    // Dev fallback — log the link so devs can accept without email.
    console.log(`[invite] accept link (email unconfigured): ${link}`);
    return;
  }

  await sendEmail({
    to: email,
    subject: `You're invited to ${environmentName} on GRID`,
    text: `${inviterName} invited you to join ${environmentName} as a ${roleCopy}.\n\nAccept the invitation:\n${link}\n\nThis link expires in 7 days.\n\n— GRID`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        <h1 style="font-size:20px;margin:0 0 16px;">You're invited to ${escapeHtml(environmentName)}</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
          <strong>${escapeHtml(inviterName)}</strong> invited you to collaborate on
          <strong>${escapeHtml(environmentName)}</strong> as a <strong>${escapeHtml(roleCopy)}</strong>.
        </p>
        <p style="font-size:14px;color:#555;margin:0 0 28px;">
          GRID is an adaptive workspace where AI connects your team's thinking across tools.
        </p>
        <p style="margin:0 0 32px;">
          <a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Accept invitation →
          </a>
        </p>
        <p style="font-size:13px;color:#666;margin:0 0 4px;">Or paste this link into your browser:</p>
        <p style="font-size:13px;color:#666;word-break:break-all;margin:0 0 24px;">${link}</p>
        <p style="font-size:13px;color:#999;margin:0;">This invitation expires in 7 days. If you weren't expecting this, you can ignore it.</p>
      </div>
    `,
  });
}

export async function consumeInvitation(token: string): Promise<{
  email: string;
  role: string;
  environmentId: string;
  invitationId: string;
} | null> {
  const inv = await prisma.environmentInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, email: true, role: true, environmentId: true, expiresAt: true, acceptedAt: true },
  });

  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) return null;

  await prisma.environmentInvitation.update({
    where: { id: inv.id },
    data: { acceptedAt: new Date() },
  });

  return { email: inv.email, role: inv.role, environmentId: inv.environmentId, invitationId: inv.id };
}
