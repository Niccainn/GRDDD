import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { requireRole, RoleAccessDenied } from '@/lib/auth/roles';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * System mutation access policy:
 *   - PATCH (rename, recolor, redescribe)   → CONTRIBUTOR
 *   - DELETE                                → ADMIN
 *
 * Replaces the previous owner-only gate. Contributors can evolve
 * Systems; only Admins and the Owner can delete them.
 */

async function resolveEnvId(systemId: string): Promise<string | null> {
  const s = await prisma.system.findFirst({
    where: { id: systemId },
    select: { environmentId: true },
  });
  return s?.environmentId ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  const envId = await resolveEnvId(id);
  if (!envId) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    await requireRole(envId, identity.id, 'CONTRIBUTOR');
  } catch (e) {
    if (e instanceof RoleAccessDenied) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const body = await req.json();
  const updated = await prisma.system.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.color && { color: body.color }),
    },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  const envId = await resolveEnvId(id);
  if (!envId) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    await requireRole(envId, identity.id, 'ADMIN');
  } catch (e) {
    if (e instanceof RoleAccessDenied) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  await prisma.system.delete({ where: { id } });
  return Response.json({ deleted: true });
}
