import { getAuthIdentity } from '@/lib/auth';
import { assertCanWriteGoal, assertCanAdminGoal, assertCanReadGoal } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  await assertCanReadGoal(id, identity.id);

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      system: { select: { id: true, name: true, color: true } },
      environment: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!goal) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    target: goal.target,
    current: goal.current,
    status: goal.status,
    progress: goal.progress,
    dueDate: goal.dueDate?.toISOString() ?? null,
    systemId: goal.systemId,
    system: goal.system,
    environment: goal.environment,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  // PATCH → CONTRIBUTOR+ (ADMIN + OWNER + CONTRIBUTOR can edit goals).
  await assertCanWriteGoal(id, identity.id);
  const body = await req.json();

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(body.title !== undefined     ? { title: body.title.trim() }         : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.metric !== undefined    ? { metric: body.metric || null }       : {}),
      ...(body.target !== undefined    ? { target: body.target || null }       : {}),
      ...(body.current !== undefined   ? { current: body.current || null }     : {}),
      ...(body.status !== undefined    ? { status: body.status }               : {}),
      ...(body.progress !== undefined  ? { progress: body.progress }           : {}),
      ...(body.dueDate !== undefined   ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
    },
    include: { system: { select: { id: true, name: true, color: true } } },
  });

  // Notify when goal reaches 100% progress
  if (goal.progress === 100) {
    createNotification({
      identityId: identity.id,
      type: 'goal_reached',
      title: `Goal reached: ${goal.title}`,
      body: goal.system?.name ? `Goal in ${goal.system.name} is now 100% complete` : 'Your goal is now 100% complete',
      href: '/goals',
    }).catch(() => {});
  }

  return Response.json({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    target: goal.target,
    current: goal.current,
    status: goal.status,
    progress: goal.progress,
    dueDate: goal.dueDate?.toISOString() ?? null,
    systemId: goal.systemId,
    system: goal.system,
    updatedAt: goal.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  // DELETE → ADMIN+ (ADMIN + OWNER only).
  await assertCanAdminGoal(id, identity.id);
  await prisma.goal.delete({ where: { id } });
  return Response.json({ deleted: true });
}
