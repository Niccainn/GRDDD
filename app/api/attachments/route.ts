import { NextRequest, NextResponse } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile, StorageError } from '@/lib/storage';

/**
 * Verify the authenticated user owns (or is a member of) the environment
 * that contains the target entity. Prevents IDOR: a user can't list or
 * attach files to entities in environments they don't belong to.
 */
async function assertEntityAccess(
  identityId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  let environmentId: string | null = null;

  switch (entityType) {
    case 'task': {
      const task = await prisma.task.findUnique({ where: { id: entityId }, select: { environmentId: true } });
      environmentId = task?.environmentId ?? null;
      break;
    }
    case 'system': {
      const system = await prisma.system.findUnique({ where: { id: entityId }, select: { environmentId: true } });
      environmentId = system?.environmentId ?? null;
      break;
    }
    case 'document': {
      const doc = await prisma.document.findUnique({ where: { id: entityId }, select: { environmentId: true } });
      environmentId = doc?.environmentId ?? null;
      break;
    }
    case 'execution': {
      const exec = await prisma.execution.findUnique({
        where: { id: entityId },
        select: { system: { select: { environmentId: true } } },
      });
      environmentId = exec?.system?.environmentId ?? null;
      break;
    }
    default:
      return false;
  }

  if (!environmentId) return false;

  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId } } },
      ],
    },
    select: { id: true },
  });

  return !!env;
}

export async function GET(request: NextRequest) {
  try {
    const identity = await getAuthIdentity();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Verify the user has access to the parent entity's environment.
    const hasAccess = await assertEntityAccess(identity.id, entityType, entityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        identity: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(attachments);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getAuthIdentity();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'file, entityType, and entityId are required' },
        { status: 400 }
      );
    }

    const validTypes = ['task', 'system', 'document', 'execution'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `entityType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the user has access to the parent entity's environment.
    const hasAccess = await assertEntityAccess(identity.id, entityType, entityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const saved = await saveFile(file, identity.id);

    const attachment = await prisma.attachment.create({
      data: {
        filename: saved.filename,
        mimeType: saved.mimeType,
        size: saved.size,
        path: saved.path,
        entityType,
        entityId,
        identityId: identity.id,
      },
      include: {
        identity: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof StorageError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await getAuthIdentity();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (attachment.identityId !== identity.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteFile(attachment.path);
    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
