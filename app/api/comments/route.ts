/**
 * GET  /api/comments?entityType=system&entityId=xxx — list comments for an entity
 * POST /api/comments — create a comment (with optional @mention notifications)
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { createNotifications } from '@/lib/notifications';

const VALID_ENTITY_TYPES = ['system', 'workflow', 'execution', 'goal', 'signal', 'task'];

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const entityType = req.nextUrl.searchParams.get('entityType');
  const entityId = req.nextUrl.searchParams.get('entityId');

  if (!entityType || !entityId) {
    return Response.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  // Verify the caller owns the entity before returning its comments.
  // All entity types are scoped via their environment's ownerId.
  const ownerFilter = { environment: { ownerId: identity.id, deletedAt: null } };
  let entityExists = false;
  switch (entityType) {
    case 'system':
      entityExists = !!(await prisma.system.findFirst({ where: { id: entityId, ...ownerFilter } }));
      break;
    case 'workflow':
      entityExists = !!(await prisma.workflow.findFirst({ where: { id: entityId, ...ownerFilter } }));
      break;
    case 'execution':
      entityExists = !!(await prisma.execution.findFirst({ where: { id: entityId, system: ownerFilter } }));
      break;
    case 'goal':
      entityExists = !!(await prisma.goal.findFirst({ where: { id: entityId, ...ownerFilter } }));
      break;
    case 'signal':
      entityExists = !!(await prisma.signal.findFirst({ where: { id: entityId, ...ownerFilter } }));
      break;
    case 'task':
      entityExists = !!(await prisma.task.findFirst({ where: { id: entityId, ...ownerFilter } }));
      break;
  }
  if (!entityExists) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { entityType, entityId, parentId: null, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      replies: {
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ comments });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { entityType, entityId, body, parentId } = await req.json();

  if (!entityType || !entityId || !body?.trim()) {
    return Response.json({ error: 'entityType, entityId, and body are required' }, { status: 400 });
  }

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return Response.json({ error: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}` }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      body: body.trim(),
      entityType,
      entityId,
      authorId: identity.id,
      ...(parentId ? { parentId } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Extract @mentions and create notifications
  const mentions = body.match(/@(\w+)/g);
  if (mentions) {
    const mentionedNames = mentions.map((m: string) => m.slice(1));
    const mentionedUsers = await prisma.identity.findMany({
      where: {
        name: { in: mentionedNames },
        deletedAt: null,
        id: { not: identity.id }, // don't notify yourself
      },
      select: { id: true },
    });

    if (mentionedUsers.length > 0) {
      createNotifications(
        mentionedUsers.map(u => u.id),
        {
          type: 'mention',
          title: `${identity.name} mentioned you`,
          body: body.length > 100 ? body.slice(0, 100) + '...' : body,
          href: `/${entityType}s/${entityId}`,
        }
      ).catch(() => {});

      // Also create reply notifications for parent comment author
      if (parentId) {
        const parent = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true },
        });
        if (parent && parent.authorId !== identity.id) {
          createNotifications(
            [parent.authorId],
            {
              type: 'comment_reply',
              title: `${identity.name} replied to your comment`,
              body: body.length > 100 ? body.slice(0, 100) + '...' : body,
              href: `/${entityType}s/${entityId}`,
            }
          ).catch(() => {});
        }
      }
    }
  }

  return Response.json({ comment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  // Only the author can delete their comment
  const comment = await prisma.comment.findFirst({
    where: { id, authorId: identity.id, deletedAt: null },
  });
  if (!comment) return Response.json({ error: 'Comment not found' }, { status: 404 });

  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return Response.json({ ok: true });
}
