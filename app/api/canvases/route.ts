/**
 * GET /api/canvases?environmentId=...
 *   → List the user's canvases for an Environment, ordered.
 *
 * POST /api/canvases
 *   Body: { environmentId, name, widgets?, layout? }
 *   → Create a new canvas at position = max+1.
 */
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Scope: the caller must own the environment. Membership-based
  // access lands when canvases become shareable (phase 6.1).
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const canvases = await prisma.canvas.findMany({
    where: { environmentId, deletedAt: null, ownerId: identity.id },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      widgets: true,
      layout: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(canvases);
}

export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const environmentId = String(body?.environmentId ?? '');
  const name = String(body?.name ?? '').trim().slice(0, 80);
  const widgets = Array.isArray(body?.widgets) ? body.widgets : [];
  const layout =
    body?.layout && typeof body.layout === 'object' ? body.layout : {};

  if (!environmentId || !name) {
    return Response.json(
      { error: 'environmentId and name required' },
      { status: 400 },
    );
  }

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const lastPosition = await prisma.canvas.aggregate({
    where: { environmentId, deletedAt: null },
    _max: { position: true },
  });

  const canvas = await prisma.canvas.create({
    data: {
      name,
      environmentId,
      ownerId: identity.id,
      widgets: JSON.stringify(widgets),
      layout: JSON.stringify(layout),
      position: (lastPosition._max.position ?? -1) + 1,
    },
  });

  return Response.json(canvas, { status: 201 });
}
