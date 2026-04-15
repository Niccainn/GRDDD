/**
 * GET  /api/portal — list portal links for the current user
 * POST /api/portal — create a new portal link
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const links = await prisma.portalLink.findMany({
    where: { environment: { ownerId: identity.id, deletedAt: null } },
    include: { environment: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({
    links: links.map(l => ({
      id: l.id,
      token: l.token,
      name: l.name,
      isActive: l.isActive,
      expiresAt: l.expiresAt,
      customTitle: l.customTitle,
      showSystems: l.showSystems,
      showWorkflows: l.showWorkflows,
      showGoals: l.showGoals,
      showExecutions: l.showExecutions,
      environmentName: l.environment.name,
      createdAt: l.createdAt,
      url: `/portal/${l.token}`,
    })),
  });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { environmentId, name, customTitle, expiresInDays, showSystems, showWorkflows, showGoals, showExecutions } = await req.json();

  if (!environmentId || !name?.trim()) {
    return Response.json({ error: 'environmentId and name are required' }, { status: 400 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) return Response.json({ error: 'Environment not found' }, { status: 404 });

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

  const link = await prisma.portalLink.create({
    data: {
      token,
      name: name.trim(),
      customTitle: customTitle?.trim() || null,
      environmentId,
      creatorId: identity.id,
      ...(expiresAt ? { expiresAt } : {}),
      showSystems: showSystems ?? true,
      showWorkflows: showWorkflows ?? true,
      showGoals: showGoals ?? true,
      showExecutions: showExecutions ?? false,
    },
  });

  return Response.json({
    id: link.id,
    token: link.token,
    url: `/portal/${link.token}`,
  }, { status: 201 });
}
