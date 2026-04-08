import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const [systemCount, workflowCount, envCount, logCount] = await Promise.all([
    prisma.system.count(),
    prisma.workflow.count(),
    prisma.environment.count(),
    prisma.intelligenceLog.count({ where: { action: 'nova_query' } }),
  ]);

  const totalTokens = await prisma.intelligenceLog.aggregate({
    _sum: { tokens: true },
    where: { action: 'nova_query' },
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
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
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
