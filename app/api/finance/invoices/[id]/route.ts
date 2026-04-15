import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsInvoice } from '@/lib/auth/ownership';
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
  await assertOwnsInvoice(id, identity.id);

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return Response.json({ error: 'Not found' }, { status: 404 });

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
    paidAt: invoice.paidAt?.toISOString() ?? null,
    notes: invoice.notes,
    environmentId: invoice.environmentId,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
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
  await assertOwnsInvoice(id, identity.id);

  const body = await req.json();

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(body.clientName !== undefined ? { clientName: body.clientName.trim() } : {}),
      ...(body.clientEmail !== undefined ? { clientEmail: body.clientEmail?.trim() || null } : {}),
      ...(body.items !== undefined ? { items: body.items } : {}),
      ...(body.subtotal !== undefined ? { subtotal: parseFloat(body.subtotal) } : {}),
      ...(body.tax !== undefined ? { tax: parseFloat(body.tax) } : {}),
      ...(body.total !== undefined ? { total: parseFloat(body.total) } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
      ...(body.paidAt !== undefined ? { paidAt: body.paidAt ? new Date(body.paidAt) : null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
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
    paidAt: invoice.paidAt?.toISOString() ?? null,
    notes: invoice.notes,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
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
  await assertOwnsInvoice(id, identity.id);
  await prisma.invoice.delete({ where: { id } });
  return Response.json({ deleted: true });
}
