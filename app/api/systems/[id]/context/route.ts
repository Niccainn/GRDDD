import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Context docs are stored as Intelligence records with type='CONTEXT_DOC'
// name = document title, description = short summary, metadata = { body: "..." }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const docs = await prisma.intelligence.findMany({
    where: { systemId: id, type: 'CONTEXT_DOC' },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(docs.map(d => ({
    id: d.id,
    title: d.name,
    summary: d.description ?? '',
    body: (() => { try { return JSON.parse(d.metadata ?? '{}').body ?? ''; } catch { return ''; } })(),
    isActive: d.isActive,
    updatedAt: d.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, body } = await req.json();

  if (!title?.trim()) return Response.json({ error: 'Title required' }, { status: 400 });

  const system = await prisma.system.findUnique({ where: { id }, select: { environmentId: true } });
  if (!system) return Response.json({ error: 'System not found' }, { status: 404 });

  const identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) return Response.json({ error: 'Identity not found' }, { status: 404 });

  const doc = await prisma.intelligence.create({
    data: {
      type: 'CONTEXT_DOC',
      name: title.trim(),
      metadata: JSON.stringify({ body: body?.trim() ?? '' }),
      systemId: id,
      environmentId: system.environmentId,
      creatorId: identity.id,
    },
  });

  return Response.json({
    id: doc.id,
    title: doc.name,
    summary: doc.description ?? '',
    body: body?.trim() ?? '',
    isActive: doc.isActive,
    updatedAt: doc.updatedAt.toISOString(),
  }, { status: 201 });
}
