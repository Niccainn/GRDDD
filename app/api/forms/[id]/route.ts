import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const form = await prisma.form.findFirst({
    where: { id, identityId: identity.id },
    include: {
      environment: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({
    id: form.id,
    name: form.name,
    description: form.description,
    fields: JSON.parse(form.fields),
    settings: JSON.parse(form.settings),
    slug: form.slug,
    isPublished: form.isPublished,
    environmentId: form.environmentId,
    environmentName: form.environment.name,
    submissions: form._count.submissions,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const existing = await prisma.form.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.fields !== undefined) data.fields = JSON.stringify(body.fields);
  if (body.settings !== undefined) data.settings = JSON.stringify(body.settings);
  if (body.isPublished !== undefined) data.isPublished = body.isPublished;

  const form = await prisma.form.update({
    where: { id },
    data,
  });

  return Response.json({
    id: form.id,
    name: form.name,
    description: form.description,
    fields: JSON.parse(form.fields),
    settings: JSON.parse(form.settings),
    slug: form.slug,
    isPublished: form.isPublished,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const existing = await prisma.form.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.formSubmission.deleteMany({ where: { formId: id } });
  await prisma.form.delete({ where: { id } });

  return Response.json({ ok: true });
}
