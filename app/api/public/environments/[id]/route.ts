/**
 * GET /api/public/environments/[id]?t=<token>
 *
 * Sanitized read-only view of an Environment, gated by a signed
 * share token. Never returns PII, integration tokens, or anything
 * mutable. Designed to be safe to hit from a cold browser with no
 * session.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyShareToken } from '@/lib/public-share';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: envId } = await params;
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

  const check = verifyShareToken('environment', envId, token);
  if (!check.ok) return Response.json({ error: check.reason ?? 'invalid' }, { status: 403 });

  const env = await prisma.environment.findFirst({
    where: { id: envId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      slug: true,
      createdAt: true,
      systems: {
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          healthScore: true,
          _count: { select: { workflows: true } },
        },
        take: 20,
      },
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    environment: {
      id: env.id,
      name: env.name,
      description: env.description,
      color: env.color,
      slug: env.slug,
      createdAt: env.createdAt.toISOString(),
      systems: env.systems.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        healthScore: s.healthScore,
        workflows: s._count.workflows,
      })),
    },
    expiresAt: check.expiresAt,
    readOnly: true,
  });
}
