/**
 * /api/integrations/[id]
 *
 * GET    — fetch a single integration (viewer+).
 * DELETE — soft-delete / disconnect (admin-only). We wipe the
 *          credential blob + preview in the same write so a revoked
 *          integration cannot be silently re-activated from a stale
 *          database replica.
 *
 * We do NOT expose PATCH here in Phase 1 — the only mutation users
 * currently need is "reconnect", which goes through POST /api/
 * integrations again and hits the manual-upsert branch.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAdministrableEnvironment, getReadableEnvironment } from '@/lib/integrations/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const integration = await prisma.integration.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      provider: true,
      displayName: true,
      accountLabel: true,
      authType: true,
      credentialsPreview: true,
      scopes: true,
      status: true,
      lastSyncedAt: true,
      lastError: true,
      lastErrorAt: true,
      expiresAt: true,
      createdAt: true,
      environmentId: true,
    },
  });
  if (!integration) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await getReadableEnvironment(integration.environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ integration });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const integration = await prisma.integration.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, environmentId: true },
  });
  if (!integration) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await getAdministrableEnvironment(integration.environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.integration.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      credentialsEnc: '',
      credentialsPreview: '',
      refreshTokenEnc: null,
      status: 'REVOKED',
    },
  });

  return Response.json({ ok: true });
}
