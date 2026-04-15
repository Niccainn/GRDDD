import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { TEMPLATES, CATEGORY_META, getTemplatesByCategory } from '@/lib/templates/registry';
import type { TemplateCategory } from '@/lib/templates/registry';

/**
 * GET /api/templates — browse the template marketplace.
 * Optional ?category= filter.
 */
export async function GET(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') as TemplateCategory | null;

  const templates = category ? getTemplatesByCategory(category) : TEMPLATES;

  return Response.json({
    templates,
    categories: CATEGORY_META,
  });
}
