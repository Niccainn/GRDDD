import { prisma } from '@/lib/db';

export async function GET() {
  const [identity, systemCount, workflowCount, envCount, logCount] = await Promise.all([
    prisma.identity.findFirst({ where: { email: 'demo@grid.app' } }),
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
  const body = await req.json();
  const identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) return Response.json({ error: 'Identity not found' }, { status: 404 });

  const updated = await prisma.identity.update({
    where: { id: identity.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return Response.json(updated);
}
