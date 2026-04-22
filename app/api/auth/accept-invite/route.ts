import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { consumeInvitation } from '@/lib/invitations';

// GET /api/auth/accept-invite?token=... — consumes the token, creates membership, redirects
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return Response.redirect(new URL('/invite/invalid', req.url));

  const inv = await consumeInvitation(token);
  if (!inv) return Response.redirect(new URL('/invite/invalid', req.url));

  const emailHash = createHash('sha256').update(inv.email).digest('hex');
  const existing = await prisma.identity.findUnique({
    where: { emailHash },
    select: { id: true },
  });

  if (existing) {
    await prisma.environmentMembership.upsert({
      where: { environmentId_identityId: { environmentId: inv.environmentId, identityId: existing.id } },
      create: { environmentId: inv.environmentId, identityId: existing.id, role: inv.role },
      update: { role: inv.role },
    });
    return Response.redirect(new URL('/dashboard', req.url));
  }

  const signUpUrl = new URL('/sign-up', req.url);
  signUpUrl.searchParams.set('invite', token);
  signUpUrl.searchParams.set('email', inv.email);
  return Response.redirect(signUpUrl);
}
