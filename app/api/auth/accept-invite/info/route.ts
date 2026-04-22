import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/auth/accept-invite/info?token=... — returns invite metadata without consuming the token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const inv = await prisma.environmentInvitation.findUnique({
    where: { tokenHash },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      environment: { select: { name: true } },
      inviter: { select: { name: true } },
    },
  });

  if (!inv) return Response.json({ error: 'Invitation not found or expired' }, { status: 404 });
  if (inv.acceptedAt) return Response.json({ error: 'Invitation already accepted' }, { status: 410 });
  if (inv.expiresAt < new Date()) return Response.json({ error: 'Invitation has expired' }, { status: 410 });

  return Response.json({
    email: inv.email,
    role: inv.role,
    environmentName: inv.environment.name,
    inviterName: inv.inviter.name,
  });
}
