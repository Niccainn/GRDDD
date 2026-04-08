import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 1) return Response.json({ environments: [], systems: [], workflows: [] });

  const [environments, systems, workflows] = await Promise.all([
    prisma.environment.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      select: { id: true, name: true, slug: true, color: true },
      take: 4,
    }),
    prisma.system.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      select: { id: true, name: true, color: true, healthScore: true, environment: { select: { name: true } } },
      take: 5,
    }),
    prisma.workflow.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      select: { id: true, name: true, status: true, system: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return Response.json({ environments, systems, workflows });
}
