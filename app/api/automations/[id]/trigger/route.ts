import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const automation = await prisma.intelligence.findUnique({ where: { id } });
  if (!automation) return Response.json({ error: 'Not found' }, { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(automation.config ?? '{}'); } catch { /* ok */ }

  const workflowId = config.workflowId as string | null;
  const input = (config.input as string) || `Automated run: ${automation.name}`;

  // Create an execution
  const execution = await prisma.execution.create({
    data: {
      status: 'RUNNING',
      input,
      systemId: automation.systemId,
      ...(workflowId ? { workflowId } : {}),
    },
  });

  // Log the automation run
  await prisma.intelligenceLog.create({
    data: {
      action: 'automation_run',
      input: JSON.stringify({ automationId: id, executionId: execution.id }),
      output: JSON.stringify({ triggered: true }),
      success: true,
      intelligenceId: id,
      systemId: automation.systemId,
    },
  });

  // Update nextRun in config
  const scheduleMap: Record<string, number> = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekdays: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const ms = scheduleMap[config.schedule as string] ?? 24 * 60 * 60 * 1000;
  config.nextRun = new Date(Date.now() + ms).toISOString();
  config.lastRun = new Date().toISOString();

  await prisma.intelligence.update({
    where: { id },
    data: { config: JSON.stringify(config) },
  });

  return Response.json({ executionId: execution.id, triggered: true });
}
