/**
 * POST /api/signals/[id]/to-task
 *
 * One-click conversion: takes an inbox signal and creates a Task
 * that inherits its title, body, priority, system/environment scope,
 * AND points back at the signal via Task.sourceSignalId for
 * provenance. Marks the signal as TRIAGED so it doesn't linger.
 *
 * Why this exists: see docs/TESTS.md MDL Gap #1. Without it, users
 * had to re-type every signal they wanted to act on — a motor-learning
 * friction that prevents the autonomous phase from developing.
 *
 * Rate-limited through the API bucket so it can't be used to bulk-
 * mutate via a script.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { assertOwnsSignal } from '@/lib/auth/ownership';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  // Ownership guard — throws 404 Response on miss to avoid existence leaks.
  try {
    await assertOwnsSignal(id, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Not found' }, { status: 404 });
  }

  const signal = await prisma.signal.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      priority: true,
      environmentId: true,
      systemId: true,
      status: true,
    },
  });
  if (!signal) return Response.json({ error: 'Signal not found' }, { status: 404 });

  // Allow the caller to override the assignee or tweak the title
  // before commit. Body is JSON: { assigneeId?, title?, dueDate?, systemId? }.
  const overrides = await req.json().catch(() => ({}));

  const [task] = await prisma.$transaction([
    prisma.task.create({
      data: {
        title: (overrides?.title as string | undefined) ?? signal.title,
        description: signal.body ?? null,
        status: 'TODO',
        priority: signal.priority,
        environmentId: signal.environmentId,
        systemId: (overrides?.systemId as string | undefined) ?? signal.systemId ?? null,
        creatorId: identity.id,
        assigneeId: (overrides?.assigneeId as string | undefined) ?? null,
        dueDate: overrides?.dueDate ? new Date(overrides.dueDate as string) : null,
        sourceSignalId: signal.id,
      },
    }),
    prisma.signal.update({
      where: { id: signal.id },
      data: {
        status: signal.status === 'UNREAD' ? 'TRIAGED' : signal.status,
        novaTriaged: true,
      },
    }),
  ]);

  return Response.json({
    task: { id: task.id, title: task.title, status: task.status, priority: task.priority },
    signalId: signal.id,
  });
}
