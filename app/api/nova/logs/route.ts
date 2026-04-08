import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const systemId = searchParams.get('systemId') ?? '';
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const logs = await prisma.intelligenceLog.findMany({
    where: {
      action: 'nova_query',
      ...(systemId ? { systemId } : {}),
      ...(search
        ? {
            OR: [
              { input: { contains: search } },
              { output: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      system: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const result = logs.map(log => {
    let query = '';
    let response = '';
    try { query = JSON.parse(log.input ?? '{}').query ?? log.input ?? ''; } catch { query = log.input ?? ''; }
    try { response = JSON.parse(log.output ?? '{}').response ?? log.output ?? ''; } catch { response = log.output ?? ''; }
    return {
      id: log.id,
      systemId: log.systemId,
      systemName: log.system?.name ?? 'Global',
      systemColor: log.system?.color ?? null,
      query,
      response,
      tokens: log.tokens,
      createdAt: log.createdAt.toISOString(),
    };
  });

  return Response.json(result);
}
