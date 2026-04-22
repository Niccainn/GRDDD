/**
 * POST /api/nova/action/[id]/teach
 *
 * Override-reason capture — when the user says "Nova got this wrong,"
 * capture the category (wrong data / wrong judgment / wrong timing)
 * plus one line of free text, and store it as a NovaMemory entry
 * that future Nova prompts can RAG against.
 *
 * The loop:   Nova acts → user overrides → user teaches → Nova acts
 * better next time.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const VALID_REASONS = ['wrong_data', 'wrong_judgment', 'wrong_timing', 'other'] as const;
type Reason = (typeof VALID_REASONS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: rawId } = await params;
  const [kind, id] = rawId.includes(':') ? rawId.split(':', 2) : ['intel', rawId];
  if (kind !== 'intel') {
    return Response.json({ error: 'Only Nova actions can be taught' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = body?.reason as Reason;
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (!VALID_REASONS.includes(reason)) {
    return Response.json({ error: 'Invalid reason' }, { status: 400 });
  }

  const log = await prisma.intelligenceLog.findFirst({
    where: {
      id,
      system: {
        environment: {
          deletedAt: null,
          OR: [
            { ownerId: identity.id },
            { memberships: { some: { identityId: identity.id } } },
          ],
        },
      },
    },
    select: {
      id: true,
      action: true,
      systemId: true,
      system: { select: { environmentId: true } },
    },
  });
  if (!log) return Response.json({ error: 'Action not found' }, { status: 404 });

  const memoryContent = [
    `Override on action: ${log.action}`,
    `Category: ${reason.replace('_', ' ')}`,
    note ? `User said: ${note}` : null,
    'Future Nova calls should factor this in when proposing similar actions.',
  ]
    .filter(Boolean)
    .join('\n');

  const memory = await prisma.novaMemory.create({
    data: {
      type: 'user_correction',
      category: reason,
      title: `Correction: ${log.action}`,
      content: memoryContent,
      source: 'user_correction',
      confidence: 0.95,
      systemId: log.systemId ?? undefined,
      environmentId: log.system?.environmentId ?? undefined,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, memoryId: memory.id });
}
