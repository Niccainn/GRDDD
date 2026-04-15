/**
 * GET /api/workflows/marketplace
 *
 * Returns the WorkflowSpec marketplace listing — every built-in and
 * runtime-registered spec, as lightweight summaries.
 *
 * Filters: ?category=, ?trigger=, ?tag=, ?q=
 *
 * This is distinct from /api/workflows which is the DB-backed legacy
 * workflow builder. The marketplace is the new spec-driven primitive.
 */
import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import {
  listWorkflows,
  summarize,
  availableCategories,
  type MarketplaceFilter,
  type WorkflowSpec,
} from '@/lib/workflows';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const filter: MarketplaceFilter = {};
  const category = params.get('category');
  const trigger = params.get('trigger');
  const tag = params.get('tag');
  const q = params.get('q');
  if (category) filter.category = category as WorkflowSpec['category'];
  if (trigger) filter.triggerType = trigger as WorkflowSpec['trigger']['type'];
  if (tag) filter.tag = tag;
  if (q) filter.search = q;

  const specs = listWorkflows(filter);
  return Response.json({
    total: specs.length,
    categories: availableCategories(),
    workflows: specs.map(summarize),
  });
}
