import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Memory is stored as IntelligenceLog with action='memory_update'
// reasoning field holds the plain-text memory summary

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const systemId = searchParams.get('systemId');
  if (!systemId) return Response.json({ memory: null });

  const log = await prisma.intelligenceLog.findFirst({
    where: { systemId, action: 'memory_update' },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ memory: log?.reasoning ?? null, updatedAt: log?.createdAt ?? null });
}

export async function POST(req: NextRequest) {
  const { systemId, memory } = await req.json();
  if (!systemId || !memory) return Response.json({ error: 'Missing fields' }, { status: 400 });

  const [identity, intelligence] = await Promise.all([
    prisma.identity.findFirst({ where: { email: 'demo@grid.app' } }),
    prisma.intelligence.findFirst({ where: { systemId, name: 'Nova' } }),
  ]);

  if (!identity || !intelligence) return Response.json({ error: 'System not ready' }, { status: 404 });

  const log = await prisma.intelligenceLog.create({
    data: {
      action: 'memory_update',
      reasoning: memory,
      input: JSON.stringify({ updated: new Date().toISOString() }),
      output: JSON.stringify({ chars: memory.length }),
      success: true,
      intelligenceId: intelligence.id,
      systemId,
      identityId: identity.id,
    },
  });

  return Response.json({ id: log.id, memory, updatedAt: log.createdAt });
}
