/**
 * PATCH /api/canvases/[id]
 *   Body: partial { name?, description?, icon?, widgets?, layout?, position? }
 *   → Update the canvas. Widgets and layout are JSON-stringified.
 *
 * DELETE /api/canvases/[id]
 *   → Soft-delete. Reversible via restore endpoint (not shipped yet).
 */
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const canvas = await prisma.canvas.findFirst({
    where: { id, ownerId: identity.id, deletedAt: null },
  });
  if (!canvas) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(canvas);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.canvas.findFirst({
    where: { id, ownerId: identity.id, deletedAt: null },
  });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim().slice(0, 80);
  if (typeof body.description === 'string') data.description = body.description.slice(0, 280);
  if (typeof body.icon === 'string') data.icon = body.icon.slice(0, 40);
  if (Array.isArray(body.widgets)) data.widgets = JSON.stringify(body.widgets);
  if (body.layout && typeof body.layout === 'object')
    data.layout = JSON.stringify(body.layout);
  if (typeof body.position === 'number') data.position = body.position;

  const updated = await prisma.canvas.update({
    where: { id },
    data,
  });
  return Response.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.canvas.findFirst({
    where: { id, ownerId: identity.id, deletedAt: null },
  });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.canvas.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return Response.json({ ok: true });
}
