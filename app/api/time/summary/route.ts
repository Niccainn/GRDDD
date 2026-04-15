import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(qMonth, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(qMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'year': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    }
    default: {
      // Default to week
      const d = now.getDay();
      const diff2 = d === 0 ? 6 : d - 1;
      start.setDate(now.getDate() - diff2);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'week';
  const { start, end } = getPeriodRange(period);

  const entries = await prisma.timeEntry.findMany({
    where: {
      identityId: identity.id,
      date: { gte: start, lte: end },
    },
    include: {
      task: { select: { id: true, title: true } },
      environment: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });

  let totalMinutes = 0;
  let billableMinutes = 0;
  let nonBillableMinutes = 0;
  let totalRevenue = 0;

  const byDayMap: Record<string, number> = {};
  const byEnvMap: Record<string, { name: string; minutes: number }> = {};
  const byTaskMap: Record<string, { title: string; minutes: number }> = {};

  for (const e of entries) {
    totalMinutes += e.duration;
    if (e.billable) {
      billableMinutes += e.duration;
      if (e.hourlyRate) {
        totalRevenue += (e.duration / 60) * e.hourlyRate;
      }
    } else {
      nonBillableMinutes += e.duration;
    }

    const dateKey = e.date.toISOString().slice(0, 10);
    byDayMap[dateKey] = (byDayMap[dateKey] || 0) + e.duration;

    if (e.environment) {
      const ek = e.environmentId;
      if (!byEnvMap[ek]) byEnvMap[ek] = { name: e.environment.name, minutes: 0 };
      byEnvMap[ek].minutes += e.duration;
    }

    if (e.task) {
      const tk = e.taskId!;
      if (!byTaskMap[tk]) byTaskMap[tk] = { title: e.task.title, minutes: 0 };
      byTaskMap[tk].minutes += e.duration;
    }
  }

  const byDay = Object.entries(byDayMap)
    .map(([date, mins]) => ({ date, hours: +(mins / 60).toFixed(2) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byEnvironment = Object.values(byEnvMap)
    .map(v => ({ envName: v.name, hours: +(v.minutes / 60).toFixed(2) }))
    .sort((a, b) => b.hours - a.hours);

  const byTask = Object.values(byTaskMap)
    .map(v => ({ taskTitle: v.title, hours: +(v.minutes / 60).toFixed(2) }))
    .sort((a, b) => b.hours - a.hours);

  return Response.json({
    period,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalHours: +(totalMinutes / 60).toFixed(2),
    billableHours: +(billableMinutes / 60).toFixed(2),
    nonBillableHours: +(nonBillableMinutes / 60).toFixed(2),
    totalRevenue: +totalRevenue.toFixed(2),
    utilizationRate: totalMinutes > 0 ? +((billableMinutes / totalMinutes) * 100).toFixed(1) : 0,
    byDay,
    byEnvironment,
    byTask,
  });
}
