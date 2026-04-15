import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsBudget } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get('budgetId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const expenses = await prisma.expense.findMany({
    where: {
      identityId: identity.id,
      ...(budgetId ? { budgetId } : {}),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(dateFrom || dateTo ? {
        date: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    },
    include: {
      budget: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return Response.json(expenses.map(e => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    vendor: e.vendor,
    date: e.date.toISOString(),
    status: e.status,
    receipt: e.receipt,
    notes: e.notes,
    budgetId: e.budgetId,
    budget: e.budget,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { description, amount, currency, category, vendor, date, budgetId, notes } = body;

  if (!description?.trim() || !amount) {
    return Response.json({ error: 'description and amount required' }, { status: 400 });
  }

  if (budgetId) {
    await assertOwnsBudget(budgetId, identity.id);
  }

  const expense = await prisma.expense.create({
    data: {
      description: description.trim(),
      amount: parseFloat(amount),
      currency: currency || 'USD',
      category: category || 'other',
      vendor: vendor?.trim() || null,
      date: date ? new Date(date) : new Date(),
      budgetId: budgetId || null,
      notes: notes?.trim() || null,
      identityId: identity.id,
    },
    include: {
      budget: { select: { id: true, name: true } },
    },
  });

  // Recalculate budget spent if linked
  if (expense.budgetId) {
    await recalcBudgetSpent(expense.budgetId);
  }

  return Response.json({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    vendor: expense.vendor,
    date: expense.date.toISOString(),
    status: expense.status,
    budgetId: expense.budgetId,
    budget: expense.budget,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }, { status: 201 });
}

async function recalcBudgetSpent(budgetId: string) {
  const result = await prisma.expense.aggregate({
    where: {
      budgetId,
      status: { in: ['approved', 'paid'] },
    },
    _sum: { amount: true },
  });
  await prisma.budget.update({
    where: { id: budgetId },
    data: { spent: result._sum.amount ?? 0 },
  });
}
