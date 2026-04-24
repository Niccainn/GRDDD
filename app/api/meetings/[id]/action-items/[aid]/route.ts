import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

async function assertAccess(meetingId: string, identityId: string) {
  const m = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
    select: { id: true },
  });
  return !!m;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id, aid } = await params;
  if (!(await assertAccess(id, identity.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json();
  const updated = await prisma.meetingActionItem.update({
    where: { id: aid },
    data: {
      ...(body.text !== undefined   ? { text: String(body.text).trim() } : {}),
      ...(body.status !== undefined ? { status: body.status }             : {}),
    },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const identity = await getAuthIdentity();
  const { id, aid } = await params;
  if (!(await assertAccess(id, identity.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.meetingActionItem.delete({ where: { id: aid } });
  return Response.json({ deleted: true });
}
