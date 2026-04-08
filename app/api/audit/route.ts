import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(200, parseInt(searchParams.get('limit')  ?? '100'));
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const action = searchParams.get('action') ?? '';
  const entity = searchParams.get('entity') ?? '';
  const envId  = searchParams.get('environmentId') ?? '';
  const search = searchParams.get('search') ?? '';

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action: { contains: action } } : {}),
      ...(entity ? { entity } : {}),
      ...(envId  ? { environmentId: envId } : {}),
      ...(search ? {
        OR: [
          { entityName: { contains: search } },
          { actorName:  { contains: search } },
          { action:     { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.auditLog.count();

  return Response.json({ logs, total });
}
