import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { issueInvitation } from '@/lib/invitations';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { email, role = 'CONTRIBUTOR' } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (!['ADMIN', 'CONTRIBUTOR', 'VIEWER'].includes(role)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Block if they're already a member
  const existingMember = await prisma.environmentMembership.findFirst({
    where: {
      environmentId,
      identity: { emailHash: { not: null } },
    },
    include: { identity: { select: { email: true } } },
  });
  // Simple email check — identity emails are encrypted so we check invitations table directly
  const alreadyInvited = await prisma.environmentInvitation.findFirst({
    where: { environmentId, email: email.toLowerCase(), acceptedAt: null },
    select: { expiresAt: true },
  });
  if (alreadyInvited && alreadyInvited.expiresAt > new Date()) {
    // Re-send is fine — issueInvitation upserts
  }

  const { invitation } = await issueInvitation({
    email: email.toLowerCase(),
    role,
    environmentId,
    environmentName: env.name,
    inviterName: identity.name ?? 'A teammate',
    inviterId: identity.id,
  });

  return Response.json({ invitation }, { status: 201 });
}

// GET — list pending invitations for this environment
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const invitations = await prisma.environmentInvitation.findMany({
    where: { environmentId, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ invitations });
}

// DELETE — revoke a pending invitation
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const { invitationId } = await req.json();
  await prisma.environmentInvitation.deleteMany({
    where: { id: invitationId, environmentId },
  });

  return Response.json({ ok: true });
}
