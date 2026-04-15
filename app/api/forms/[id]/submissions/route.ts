import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

  const form = await prisma.form.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!form) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const [submissions, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.formSubmission.count({ where: { formId: id } }),
  ]);

  return Response.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      data: JSON.parse(s.data),
      metadata: JSON.parse(s.metadata),
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}
