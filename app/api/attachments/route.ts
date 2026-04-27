import { NextRequest, NextResponse } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile, StorageError } from '@/lib/storage';
import { decryptIdentityFields } from '@/lib/crypto/identity-pii';

const envOwnershipFilter = (identityId: string) => ({
  deletedAt: null,
  OR: [
    { ownerId: identityId },
    { memberships: { some: { identityId } } },
  ],
});

/**
 * Verify the caller owns the entity via its parent environment.
 * Returns true if ownership is confirmed, false otherwise.
 * Uses 404 semantics (never 403) to avoid leaking resource existence.
 */
async function assertOwnsEntity(
  entityType: string,
  entityId: string,
  identityId: string
): Promise<boolean> {
  switch (entityType) {
    case 'task': {
      const task = await prisma.task.findFirst({
        where: {
          id: entityId,
          deletedAt: null,
          environment: envOwnershipFilter(identityId),
        },
        select: { id: true },
      });
      return !!task;
    }
    case 'system': {
      const system = await prisma.system.findFirst({
        where: {
          id: entityId,
          deletedAt: null,
          environment: envOwnershipFilter(identityId),
        },
        select: { id: true },
      });
      return !!system;
    }
    case 'document': {
      const doc = await prisma.document.findFirst({
        where: {
          id: entityId,
          environment: envOwnershipFilter(identityId),
        },
        select: { id: true },
      });
      return !!doc;
    }
    case 'execution': {
      const exec = await prisma.execution.findFirst({
        where: {
          id: entityId,
          system: { environment: envOwnershipFilter(identityId) },
        },
        select: { id: true },
      });
      return !!exec;
    }
    default:
      return false;
  }
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

    const owns = await assertOwnsEntity(entityType, entityId, identity.id);
    if (!owns) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        identity: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(
      attachments.map(a => ({ ...a, identity: decryptIdentityFields(a.identity) })),
    );
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

    const owns = await assertOwnsEntity(entityType, entityId, identity.id);
    if (!owns) {
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

    return NextResponse.json(
      { ...attachment, identity: decryptIdentityFields(attachment.identity) },
      { status: 201 },
    );
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
