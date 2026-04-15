import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsExpense } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  await assertOwnsExpense(id, identity.id);

  const body = await req.json();

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(body.description !== undefined ? { description: body.description.trim() } : {}),
      ...(body.amount !== undefined ? { amount: parseFloat(body.amount) } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.vendor !== undefined ? { vendor: body.vendor?.trim() || null } : {}),
      ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      ...(body.budgetId !== undefined ? { budgetId: body.budgetId || null } : {}),
    },
    include: {
      budget: { select: { id: true, name: true } },
    },
  });

  // Recalculate budget spent for current and potentially previous budget
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
  const expense = await assertOwnsExpense(id, identity.id);
  const budgetId = expense.budgetId;

  await prisma.expense.delete({ where: { id } });

  if (budgetId) {
    await recalcBudgetSpent(budgetId);
  }

  return Response.json({ deleted: true });
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
