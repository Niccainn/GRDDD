/**
 * GET /api/agents/templates
 *
 * Returns the blueprint catalog — the "pick your starting point" grid
 * on /agents/new. Templates are code-defined (see lib/agents/templates.ts),
 * so this route is auth-gated but environment-independent: the same
 * catalog surfaces to every workspace.
 */

import { getAuthIdentity } from '@/lib/auth';
import { BLUEPRINTS } from '@/lib/agents/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Auth gate — the catalog isn't secret but there's no reason to
  // serve it to unauthenticated callers either.
  await getAuthIdentity();

  // Ship only what the picker needs. The full skeleton + questions
  // for a specific blueprint come back from the shape endpoint when
  // the user clicks into one.
  const summary = BLUEPRINTS.map((b) => ({
    id: b.id,
    title: b.title,
    emoji: b.emoji,
    category: b.category,
    tagline: b.tagline,
    questionCount: b.questions.length,
  }));

  return Response.json(summary);
}
