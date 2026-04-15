import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const systems = await prisma.system.findMany({
    where: { environment: { ownerId: identity.id, deletedAt: null } },
    select: { id: true, name: true, environmentId: true, color: true },
    orderBy: { name: 'asc' },
  });
  return Response.json(systems);
}
