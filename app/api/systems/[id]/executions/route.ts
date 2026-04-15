import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsSystem } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsSystem(id, identity.id);

  // Get executions for the last 14 days grouped by day
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const executions = await prisma.execution.findMany({
    where: { systemId: id, createdAt: { gte: since } },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  // Build 14-day buckets
  const buckets: Record<string, { date: string; completed: number; failed: number; running: number }> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, completed: 0, failed: 0, running: 0 };
  }

  for (const exec of executions) {
    const key = exec.createdAt.toISOString().slice(0, 10);
    if (buckets[key]) {
      const status = exec.status.toLowerCase() as 'completed' | 'failed' | 'running';
      if (status in buckets[key]) buckets[key][status]++;
    }
  }

  const recentExecutions = await prisma.execution.findMany({
    where: { systemId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { workflow: { select: { name: true } } },
  });

  return Response.json({
    chart: Object.values(buckets),
    recent: recentExecutions.map(e => ({
      id: e.id,
      status: e.status,
      input: e.input,
      output: e.output,
      workflowName: e.workflow?.name ?? null,
      currentStage: e.currentStage,
      createdAt: e.createdAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
    })),
    total: await prisma.execution.count({ where: { systemId: id } }),
  });
}
