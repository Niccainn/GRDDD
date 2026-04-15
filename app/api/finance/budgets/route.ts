import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironment } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const envId = searchParams.get('envId') ?? undefined;

  const budgets = await prisma.budget.findMany({
    where: {
      environment: { ownerId: identity.id, deletedAt: null },
      ...(envId ? { environmentId: envId } : {}),
    },
    include: {
      expenses: {
        where: { status: 'approved' },
        select: { amount: true },
      },
      environment: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(budgets.map(b => {
    const approvedSpent = b.expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      id: b.id,
      name: b.name,
      amount: b.amount,
      spent: approvedSpent,
      currency: b.currency,
      period: b.period,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate?.toISOString() ?? null,
      category: b.category,
      environmentId: b.environmentId,
      environment: b.environment,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { name, amount, currency, period, startDate, endDate, category, environmentId } = body;

  if (!name?.trim() || !amount || !startDate || !environmentId) {
    return Response.json({ error: 'name, amount, startDate, and environmentId required' }, { status: 400 });
  }

  await assertOwnsEnvironment(environmentId, identity.id);

  const budget = await prisma.budget.create({
    data: {
      name: name.trim(),
      amount: parseFloat(amount),
      currency: currency || 'USD',
      period: period || 'monthly',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      category: category || 'general',
      environmentId,
      identityId: identity.id,
    },
  });

  return Response.json({
    id: budget.id,
    name: budget.name,
    amount: budget.amount,
    spent: budget.spent,
    currency: budget.currency,
    period: budget.period,
    startDate: budget.startDate.toISOString(),
    endDate: budget.endDate?.toISOString() ?? null,
    category: budget.category,
    environmentId: budget.environmentId,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  }, { status: 201 });
}
