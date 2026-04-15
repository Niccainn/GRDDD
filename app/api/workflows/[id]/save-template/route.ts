import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWorkflow } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Saves the workflow as a reusable template entry in the DB.
 * Templates are stored as ARCHIVED workflows with a special config flag.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const category: string = body.category?.trim() || 'Custom';

  // Ownership check — ensures the caller owns this workflow's environment
  await assertOwnsWorkflow(id, identity.id);

  const source = await prisma.workflow.findUnique({ where: { id } });
  if (!source) return Response.json({ error: 'Not found' }, { status: 404 });

  // Store the template config within the source workflow's config field
  const existingConfig = (() => { try { return JSON.parse(source.config ?? '{}'); } catch { return {}; } })();
  await prisma.workflow.update({
    where: { id },
    data: {
      config: JSON.stringify({
        ...existingConfig,
        isTemplate: true,
        templateCategory: category,
        templateSavedAt: new Date().toISOString(),
      }),
    },
  });

  return Response.json({ success: true, templateName: source.name, category });
}
