import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? undefined;
  const severity = searchParams.get('severity') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const insights = await prisma.crossDomainInsight.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });

  return Response.json(insights);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, description, category, severity, confidence, sourceDomains, targetDomains, evidence, dataPoints } = body;

  if (!title || !description || !category || !sourceDomains || !targetDomains) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const insight = await prisma.crossDomainInsight.create({
    data: {
      title,
      description,
      category,
      severity: severity ?? 'info',
      confidence: confidence ?? 0.6,
      sourceDomains: typeof sourceDomains === 'string' ? sourceDomains : JSON.stringify(sourceDomains),
      targetDomains: typeof targetDomains === 'string' ? targetDomains : JSON.stringify(targetDomains),
      evidence: evidence ? (typeof evidence === 'string' ? evidence : JSON.stringify(evidence)) : null,
      dataPoints: dataPoints ?? 0,
    },
  });

  return Response.json(insight, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { id, acknowledged, actionTaken } = body;

  if (!id) {
    return Response.json({ error: 'Missing insight id' }, { status: 400 });
  }

  const existing = await prisma.crossDomainInsight.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Insight not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof acknowledged === 'boolean') data.acknowledged = acknowledged;
  if (typeof actionTaken === 'string') {
    data.actionTaken = actionTaken;
    data.resolvedAt = new Date();
  }

  const updated = await prisma.crossDomainInsight.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}
