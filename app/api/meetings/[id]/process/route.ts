import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { processMeeting } from '@/lib/meetings/transcription';

/**
 * POST /api/meetings/[id]/process — runs the transcription adapter
 * against a meeting and writes transcript + summary + action items.
 * Idempotent: existing action items are preserved and only new ones
 * are appended, so re-running never duplicates promotions.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: {
      id,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    include: { actionItems: true },
  });
  if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 });

  const attendees: string[] = meeting.attendees
    ? (() => { try { return JSON.parse(meeting.attendees!); } catch { return []; } })()
    : [];

  const result = await processMeeting({
    title: meeting.title,
    description: meeting.description,
    attendees,
  });

  const existingTexts = new Set(meeting.actionItems.map(a => a.text));
  const newItems = result.actionItems.filter(t => !existingTexts.has(t));
  const baseOrder = meeting.actionItems.length;

  await prisma.$transaction([
    prisma.meeting.update({
      where: { id },
      data: {
        transcript: result.transcript,
        summary: result.summary,
        status: 'DONE',
      },
    }),
    ...newItems.map((text, i) =>
      prisma.meetingActionItem.create({
        data: { meetingId: id, text, order: baseOrder + i },
      })
    ),
  ]);

  const updated = await prisma.meeting.findUnique({
    where: { id },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      creator: { select: { id: true, name: true } },
      actionItems: { orderBy: { order: 'asc' } },
    },
  });

  return Response.json(updated);
}
