import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.timeEntry.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.description !== undefined) data.description = body.description;
  if (body.duration !== undefined) data.duration = Math.round(Number(body.duration));
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.billable !== undefined) data.billable = body.billable;
  if (body.hourlyRate !== undefined) data.hourlyRate = body.hourlyRate != null ? Number(body.hourlyRate) : null;
  if (body.taskId !== undefined) data.taskId = body.taskId || null;
  if (body.environmentId !== undefined) data.environmentId = body.environmentId;
  if (body.startTime !== undefined) data.startTime = body.startTime ? new Date(body.startTime) : null;
  if (body.endTime !== undefined) data.endTime = body.endTime ? new Date(body.endTime) : null;

  const updated = await prisma.timeEntry.update({
    where: { id },
    data,
    include: {
      task: { select: { id: true, title: true } },
      environment: { select: { id: true, name: true } },
    },
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.timeEntry.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return Response.json({ ok: true });
}
