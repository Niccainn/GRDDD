import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/forms';
import { NextRequest } from 'next/server';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Scope through environment.ownerId AND identityId — same defense
  // as automations. A stale form pointing at a foreign env would
  // otherwise leak that env's name through.
  const forms = await prisma.form.findMany({
    where: {
      identityId: identity.id,
      environment: { ownerId: identity.id, deletedAt: null },
    },
    include: {
      environment: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(
    forms.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      slug: f.slug,
      isPublished: f.isPublished,
      environmentName: f.environment.name,
      environmentId: f.environmentId,
      submissions: f._count.submissions,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  );
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { name, environmentId, fields } = await req.json();
  if (!name || !environmentId) {
    return Response.json({ error: 'Name and environmentId are required' }, { status: 400 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Generate unique slug
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const existing = await prisma.form.findUnique({ where: { slug } });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const form = await prisma.form.create({
    data: {
      name,
      slug,
      environmentId,
      identityId: identity.id,
      fields: fields ? JSON.stringify(fields) : '[]',
    },
  });

  return Response.json({ id: form.id, slug: form.slug });
}
