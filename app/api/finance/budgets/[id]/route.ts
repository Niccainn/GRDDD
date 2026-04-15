import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsBudget } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  await assertOwnsBudget(id, identity.id);

  const budget = await prisma.budget.findUnique({
    where: { id },
    include: {
      expenses: {
        orderBy: { date: 'desc' },
      },
      environment: { select: { id: true, name: true } },
    },
  });

  if (!budget) return Response.json({ error: 'Not found' }, { status: 404 });

  const approvedSpent = budget.expenses
    .filter(e => e.status === 'approved' || e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0);

  return Response.json({
    id: budget.id,
    name: budget.name,
    amount: budget.amount,
    spent: approvedSpent,
    currency: budget.currency,
    period: budget.period,
    startDate: budget.startDate.toISOString(),
    endDate: budget.endDate?.toISOString() ?? null,
    category: budget.category,
    environmentId: budget.environmentId,
    environment: budget.environment,
    expenses: budget.expenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      vendor: e.vendor,
      date: e.date.toISOString(),
      status: e.status,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    })),
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  await assertOwnsBudget(id, identity.id);

  const body = await req.json();

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.amount !== undefined ? { amount: parseFloat(body.amount) } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.period !== undefined ? { period: body.period } : {}),
      ...(body.startDate !== undefined ? { startDate: new Date(body.startDate) } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
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
    updatedAt: budget.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  await assertOwnsBudget(id, identity.id);
  await prisma.budget.delete({ where: { id } });
  return Response.json({ deleted: true });
}
