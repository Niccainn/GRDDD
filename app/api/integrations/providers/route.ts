/**
 * GET /api/integrations/providers
 *
 * Static registry endpoint — lists every provider Grid knows about,
 * annotated with whether its env vars are present on THIS deployment.
 * The /integrations page uses this to render the provider grid with
 * greyed-out cards + "Coming soon" / "Not configured" tooltips so the
 * operator knows exactly which integrations need env setup.
 *
 * Auth: authenticated users only — no environment scoping needed.
 * The registry itself contains no secrets.
 */

import { getAuthIdentityOrNull } from '@/lib/auth';
import { PROVIDERS, summarizeProvider, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/integrations/registry';

export async function GET() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({
    providers: PROVIDERS.map(summarizeProvider),
    categories: CATEGORY_ORDER.map(id => ({ id, label: CATEGORY_LABELS[id] })),
  });
}
