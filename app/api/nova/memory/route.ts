import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const environmentId = searchParams.get('environmentId');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = { isActive: true };
  if (type) where.type = type;
  if (environmentId) where.environmentId = environmentId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  const memories = await prisma.novaMemory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ memories, total: memories.length });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, content, type, category, environmentId, source } = body;

  if (!title || !content || !type) {
    return Response.json({ error: 'title, content, and type are required' }, { status: 400 });
  }

  const validTypes = ['brand_context', 'market_insight', 'user_correction', 'strategic_context', 'learned_preference', 'pattern'];
  if (!validTypes.includes(type)) {
    return Response.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const memory = await prisma.novaMemory.create({
    data: {
      title,
      content,
      type,
      category: category ?? null,
      environmentId: environmentId ?? null,
      source: source ?? 'user_input',
      confidence: 0.9,
    },
  });

  return Response.json({ memory }, { status: 201 });
}
