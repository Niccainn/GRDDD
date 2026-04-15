import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const taskId = searchParams.get('taskId');
  const envId = searchParams.get('envId');
  const billable = searchParams.get('billable');

  const where: Record<string, unknown> = {
    identityId: identity.id,
  };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
  }
  if (taskId) where.taskId = taskId;
  if (envId) where.environmentId = envId;
  if (billable === 'true') where.billable = true;
  if (billable === 'false') where.billable = false;

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      task: { select: { id: true, title: true } },
      environment: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  });

  return Response.json(entries);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { description, duration, date, billable, hourlyRate, taskId, environmentId, startTime, endTime } = body;

  if (!environmentId) {
    return Response.json({ error: 'environmentId is required' }, { status: 400 });
  }
  if (duration === undefined || duration === null) {
    return Response.json({ error: 'duration is required' }, { status: 400 });
  }

  // Verify environment ownership or membership
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      description: description ?? '',
      duration: Math.round(Number(duration)),
      date: date ? new Date(date) : new Date(),
      billable: billable !== false,
      hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
      taskId: taskId || null,
      environmentId,
      identityId: identity.id,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
    },
    include: {
      task: { select: { id: true, title: true } },
      environment: { select: { id: true, name: true } },
    },
  });

  return Response.json(entry, { status: 201 });
}
