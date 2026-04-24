import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

async function loadAccessible(id: string, identityId: string) {
  return prisma.meeting.findFirst({
    where: {
      id,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      creator: { select: { id: true, name: true } },
      actionItems: { orderBy: { order: 'asc' } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const meeting = await loadAccessible(id, identity.id);
  if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(meeting);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;

  const existing = await loadAccessible(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      ...(body.title !== undefined       ? { title: String(body.title).trim() }             : {}),
      ...(body.description !== undefined ? { description: body.description || null }         : {}),
      ...(body.status !== undefined      ? { status: body.status }                           : {}),
      ...(body.summary !== undefined     ? { summary: body.summary || null }                 : {}),
      ...(body.transcript !== undefined  ? { transcript: body.transcript || null }           : {}),
      ...(body.recordingUrl !== undefined? { recordingUrl: body.recordingUrl || null }       : {}),
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      creator: { select: { id: true, name: true } },
      actionItems: { orderBy: { order: 'asc' } },
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const existing = await loadAccessible(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
  await prisma.meeting.delete({ where: { id } });
  return Response.json({ deleted: true });
}
