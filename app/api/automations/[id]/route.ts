import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  const body = await req.json();

  const current = await prisma.intelligence.findUnique({ where: { id } });
  if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(current.config ?? '{}'); } catch { /* ok */ }

  if (body.isActive !== undefined) config.enabled = body.isActive;
  if (body.schedule) config.schedule = body.schedule;
  if (body.input !== undefined) config.input = body.input;

  const updated = await prisma.intelligence.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      config: JSON.stringify(config),
    },
  });
  return Response.json({ id: updated.id, isActive: updated.isActive });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await prisma.intelligence.delete({ where: { id } });
  return Response.json({ deleted: true });
}

// POST to /api/automations/[id]/trigger is handled by trigger/route.ts
