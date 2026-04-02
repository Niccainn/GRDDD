import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Saves the workflow as a reusable template entry in the DB.
 * Templates are stored as ARCHIVED workflows with a special config flag.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const category: string = body.category?.trim() || 'Custom';

  const source = await prisma.workflow.findUnique({ where: { id } });
  if (!source) return Response.json({ error: 'Not found' }, { status: 404 });

  const identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) return Response.json({ error: 'No identity' }, { status: 500 });

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
