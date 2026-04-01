import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const intel = await prisma.intelligence.findFirst({
    where: { systemId: id, type: 'AI_AGENT' },
    select: { id: true, config: true },
  });
  if (!intel) return Response.json({ model: 'claude-opus-4-6' });
  try {
    const cfg = JSON.parse(intel.config ?? '{}');
    return Response.json({ model: cfg.model ?? 'claude-opus-4-6' });
  } catch {
    return Response.json({ model: 'claude-opus-4-6' });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { model } = await req.json();

  const VALID_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5'];
  if (!VALID_MODELS.includes(model)) {
    return Response.json({ error: 'Invalid model' }, { status: 400 });
  }

  const identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  const system   = await prisma.system.findUnique({ where: { id }, select: { environmentId: true } });
  if (!system || !identity) return Response.json({ error: 'Not found' }, { status: 404 });

  const intel = await prisma.intelligence.findFirst({ where: { systemId: id, type: 'AI_AGENT' } });
  if (intel) {
    const existing = (() => { try { return JSON.parse(intel.config ?? '{}'); } catch { return {}; } })();
    await prisma.intelligence.update({
      where: { id: intel.id },
      data: { config: JSON.stringify({ ...existing, model }) },
    });
  } else {
    await prisma.intelligence.create({
      data: {
        type: 'AI_AGENT',
        name: 'Nova',
        systemId: id,
        environmentId: system.environmentId,
        creatorId: identity.id,
        config: JSON.stringify({ model }),
      },
    });
  }

  return Response.json({ model });
}
