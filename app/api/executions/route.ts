import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { workflowId, systemId, input, withStages } = await req.json();
  if (!systemId || !input) {
    return Response.json({ error: 'Missing systemId or input' }, { status: 400 });
  }

  const execution = await prisma.execution.create({
    data: {
      status: withStages ? 'RUNNING' : 'COMPLETED',
      input,
      systemId,
      currentStage: withStages ? 0 : null,
      ...(workflowId ? { workflowId } : {}),
    },
  });

  await prisma.systemState.upsert({
    where: { systemId },
    update: { lastActivity: new Date() },
    create: { systemId, lastActivity: new Date() },
  });

  return Response.json(execution);
}
