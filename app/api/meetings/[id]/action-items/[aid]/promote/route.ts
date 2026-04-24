import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

/**
 * POST /api/meetings/[id]/action-items/[aid]/promote
 *
 * The GRID wedge vs Sana. A meeting action item isn't just text — it
 * becomes a live Task, Signal, Goal, or Project that Nova can execute.
 * After promotion we stamp `promotedToType` / `promotedToId` on the
 * action item so the meeting detail view can deep-link into the
 * created entity and flip status to PROMOTED.
 *
 * Body: { target: 'TASK' | 'SIGNAL' | 'GOAL' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id, aid } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: {
      id,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id, role: { in: ['ADMIN', 'CONTRIBUTOR'] } } } },
        ],
      },
    },
    select: { id: true, environmentId: true, title: true },
  });
  if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 });

  const item = await prisma.meetingActionItem.findFirst({
    where: { id: aid, meetingId: id },
  });
  if (!item) return Response.json({ error: 'Action item not found' }, { status: 404 });
  if (item.status === 'PROMOTED') {
    return Response.json({ error: 'Already promoted', item }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const target: 'TASK' | 'SIGNAL' | 'GOAL' = body.target ?? 'TASK';

  let promotedId: string;
  let href: string;

  if (target === 'TASK') {
    const task = await prisma.task.create({
      data: {
        title: item.text,
        description: `From meeting: ${meeting.title}`,
        environmentId: meeting.environmentId,
        creatorId: identity.id,
      },
    });
    promotedId = task.id;
    href = `/tasks`;
  } else if (target === 'SIGNAL') {
    const signal = await prisma.signal.create({
      data: {
        title: item.text,
        body: `Captured from meeting: ${meeting.title}`,
        source: 'meeting',
        sourceRef: meeting.id,
        environmentId: meeting.environmentId,
      },
    });
    promotedId = signal.id;
    href = `/inbox`;
  } else if (target === 'GOAL') {
    // Goals need a system. Pick the first accessible system in the
    // environment; if there are none, fall back to creating a Task so
    // the promotion still succeeds.
    const sys = await prisma.system.findFirst({
      where: { environmentId: meeting.environmentId, deletedAt: null },
      select: { id: true },
    });
    if (!sys) {
      return Response.json(
        { error: 'No system in this environment to attach a goal to' },
        { status: 400 }
      );
    }
    const goal = await prisma.goal.create({
      data: {
        title: item.text,
        description: `From meeting: ${meeting.title}`,
        status: 'ON_TRACK',
        progress: 0,
        systemId: sys.id,
        environmentId: meeting.environmentId,
        creatorId: identity.id,
      },
    });
    promotedId = goal.id;
    href = `/goals/${goal.id}`;
  } else {
    return Response.json({ error: 'Invalid target' }, { status: 400 });
  }

  const updated = await prisma.meetingActionItem.update({
    where: { id: aid },
    data: {
      status: 'PROMOTED',
      promotedToType: target,
      promotedToId: promotedId,
    },
  });

  return Response.json({ item: updated, href });
}
