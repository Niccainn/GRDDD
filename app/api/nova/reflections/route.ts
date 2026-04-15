import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');
  const category = searchParams.get('category') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (!environmentId) {
    return Response.json({ error: 'environmentId is required' }, { status: 400 });
  }

  const reflections = await prisma.novaReflection.findMany({
    where: {
      environmentId,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });

  return Response.json(reflections);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const {
    insight, category, severity, metric, metricValue, metricDelta,
    confidence, environmentId, systemId, workflowId, suggestion,
  } = body;

  if (!insight || !category || !environmentId) {
    return Response.json({ error: 'insight, category, and environmentId are required' }, { status: 400 });
  }

  const reflection = await prisma.novaReflection.create({
    data: {
      insight,
      category,
      severity: severity ?? 'info',
      metric: metric ?? null,
      metricValue: metricValue ?? null,
      metricDelta: metricDelta ?? null,
      confidence: confidence ?? 0.7,
      environmentId,
      systemId: systemId ?? null,
      workflowId: workflowId ?? null,
      suggestion: suggestion ?? null,
    },
  });

  return Response.json(reflection, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { id, actionTaken } = body;

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const reflection = await prisma.novaReflection.update({
    where: { id },
    data: {
      acknowledged: true,
      ...(actionTaken ? { actionTaken } : {}),
    },
  });

  return Response.json(reflection);
}
