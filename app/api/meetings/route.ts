import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { assertCanWriteEnvironment } from '@/lib/auth/ownership';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');

  // When environmentId is omitted the caller is the global /meetings
  // page, which lists everything the user can read across every env
  // they belong to. Scoped reads stay strict.
  const envFilter = environmentId
    ? { id: environmentId }
    : {};

  const meetings = await prisma.meeting.findMany({
    where: {
      ...(environmentId ? { environmentId } : {}),
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
        ...envFilter,
      },
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      actionItems: { select: { id: true, status: true } },
    },
    orderBy: { startTime: 'desc' },
    take: 200,
  });

  return Response.json({ meetings });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, description, startTime, endTime, location, videoLink, attendees, environmentId } = body;

  if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });
  if (!startTime) return Response.json({ error: 'startTime required' }, { status: 400 });
  if (!endTime) return Response.json({ error: 'endTime required' }, { status: 400 });
  if (!environmentId) return Response.json({ error: 'environmentId required' }, { status: 400 });

  // POST → CONTRIBUTOR+ (schedule meetings). VIEWERs cannot.
  // assertCanWriteEnvironment throws a Response on failure, which
  // Next.js propagates back as the response — no explicit catch.
  await assertCanWriteEnvironment(environmentId, identity.id);

  const meeting = await prisma.meeting.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location: location?.trim() ?? null,
      videoLink: videoLink?.trim() ?? null,
      attendees: Array.isArray(attendees) ? JSON.stringify(attendees) : null,
      environmentId,
      creatorId: identity.id,
    },
  });

  return Response.json({ meeting }, { status: 201 });
}
