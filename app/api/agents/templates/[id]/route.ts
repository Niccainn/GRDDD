/**
 * GET /api/agents/templates/[id]
 *
 * Full detail for a single blueprint — title, category, skeleton (for
 * preview), and the shaping questions the /agents/new surface needs to
 * render the shape step. This exists as a separate endpoint so the
 * list call (/api/agents/templates) stays lightweight.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { findBlueprint } from '@/lib/agents/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await getAuthIdentity();
  const { id } = await params;
  const b = findBlueprint(id);
  if (!b) return Response.json({ error: 'Unknown blueprint' }, { status: 404 });
  return Response.json({
    id: b.id,
    title: b.title,
    emoji: b.emoji,
    category: b.category,
    tagline: b.tagline,
    defaultName: b.defaultName,
    defaultDescription: b.defaultDescription,
    questions: b.questions,
    skeleton: b.skeleton,
  });
}
