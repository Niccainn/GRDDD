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
  const status = searchParams.get('status') ?? undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      environment: { ownerId: identity.id, deletedAt: null },
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(invoices.map(inv => ({
    id: inv.id,
    number: inv.number,
    clientName: inv.clientName,
    clientEmail: inv.clientEmail,
    items: inv.items,
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    currency: inv.currency,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    notes: inv.notes,
    environmentId: inv.environmentId,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { clientName, clientEmail, items, subtotal, tax, total, currency, dueDate, notes, environmentId } = body;

  if (!clientName?.trim() || !environmentId) {
    return Response.json({ error: 'clientName and environmentId required' }, { status: 400 });
  }

  await assertOwnsEnvironment(environmentId, identity.id);

  // Generate next invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { environment: { ownerId: identity.id } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const match = lastInvoice.number.match(/INV-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const number = `INV-${String(nextNum).padStart(4, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientName: clientName.trim(),
      clientEmail: clientEmail?.trim() || null,
      items: items || '[]',
      subtotal: parseFloat(subtotal || '0'),
      tax: parseFloat(tax || '0'),
      total: parseFloat(total || '0'),
      currency: currency || 'USD',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes?.trim() || null,
      environmentId,
      identityId: identity.id,
    },
  });

  return Response.json({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    items: invoice.items,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    currency: invoice.currency,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    notes: invoice.notes,
    environmentId: invoice.environmentId,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  }, { status: 201 });
}
