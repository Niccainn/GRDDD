import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Automations are stored as Intelligence records with type='AUTOMATION'
// config JSON: { workflowId, schedule, input, nextRun, lastRun, enabled }

const SCHEDULES: Record<string, string> = {
  hourly: 'Every hour',
  daily: 'Every day',
  weekdays: 'Weekdays (Mon–Fri)',
  weekly: 'Every week',
  monthly: 'Every month',
};

function nextRunTime(schedule: string): Date {
  const now = new Date();
  switch (schedule) {
    case 'hourly': return new Date(now.getTime() + 60 * 60 * 1000);
    case 'daily': {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d;
    }
    case 'weekdays': {
      const d = new Date(now); d.setDate(d.getDate() + 1);
      while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0); return d;
    }
    case 'weekly': {
      const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d;
    }
    case 'monthly': {
      const d = new Date(now); d.setMonth(d.getMonth() + 1); d.setDate(1); d.setHours(9, 0, 0, 0); return d;
    }
    default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const systemId = searchParams.get('systemId') ?? undefined;

  const automations = await prisma.intelligence.findMany({
    where: { type: 'AUTOMATION', ...(systemId ? { systemId } : {}) },
    include: {
      system: { select: { id: true, name: true, color: true } },
      logs: {
        where: { action: 'automation_run' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, success: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(automations.map(a => {
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(a.config ?? '{}'); } catch { /* ok */ }
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      isActive: a.isActive,
      systemId: a.systemId,
      systemName: a.system.name,
      systemColor: a.system.color,
      schedule: config.schedule as string ?? 'daily',
      scheduleLabel: SCHEDULES[config.schedule as string] ?? 'Daily',
      workflowId: config.workflowId as string ?? null,
      input: config.input as string ?? '',
      nextRun: config.nextRun as string ?? null,
      lastRun: a.logs[0]?.createdAt?.toISOString() ?? null,
      lastSuccess: a.logs[0]?.success ?? null,
    };
  }));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { name, description, systemId, workflowId, schedule, input } = await req.json();
  if (!name || !systemId || !schedule) return Response.json({ error: 'Missing fields' }, { status: 400 });

  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return Response.json({ error: 'Not found' }, { status: 404 });

  const nextRun = nextRunTime(schedule);
  const automation = await prisma.intelligence.create({
    data: {
      type: 'AUTOMATION',
      name,
      description: description || `Runs ${SCHEDULES[schedule] ?? schedule}`,
      isActive: true,
      systemId,
      environmentId: system.environmentId,
      creatorId: identity.id,
      config: JSON.stringify({ workflowId: workflowId ?? null, schedule, input: input ?? '', nextRun: nextRun.toISOString() }),
    },
  });

  return Response.json({ id: automation.id });
}
