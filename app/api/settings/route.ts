import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  // Scope stats to environments the authenticated user owns or is a member of.
  const envFilter = {
    deletedAt: null,
    OR: [
      { ownerId: identity.id },
      { memberships: { some: { identityId: identity.id } } },
    ],
  };
  const userEnvIds = await prisma.environment.findMany({
    where: envFilter,
    select: { id: true },
  }).then(envs => envs.map(e => e.id));

  const envScope = { environmentId: { in: userEnvIds } };

  const [systemCount, workflowCount, envCount, logCount] = await Promise.all([
    prisma.system.count({ where: envScope }),
    prisma.workflow.count({ where: envScope }),
    Promise.resolve(userEnvIds.length),
    prisma.intelligenceLog.count({ where: { action: 'nova_query', identityId: identity.id } }),
  ]);

  const totalTokens = await prisma.intelligenceLog.aggregate({
    _sum: { tokens: true },
    where: { action: 'nova_query', identityId: identity.id },
  });

  return Response.json({
    identity,
    stats: {
      environments: envCount,
      systems: systemCount,
      workflows: workflowCount,
      novaInteractions: logCount,
      totalTokens: totalTokens._sum.tokens ?? 0,
    },
    apiKeyConfigured: true,
  });
}

export async function PATCH(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const body = await req.json();
  const updated = await prisma.identity.update({
    where: { id: identity.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return Response.json(updated);
}
