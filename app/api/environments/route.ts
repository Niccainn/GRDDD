import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const environments = await prisma.environment.findMany({
    where: { ownerId: identity.id, deletedAt: null },
    select: { id: true, name: true, slug: true, color: true },
    orderBy: { name: 'asc' },
  });
  return Response.json(environments);
}
