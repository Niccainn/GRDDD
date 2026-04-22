/**
 * GET /api/projects/templates — public-ish catalog of starting
 * points. Returned verbatim from lib/projects/templates.ts so the
 * launcher can render them without duplication.
 */

import { PROJECT_TEMPLATES } from '@/lib/projects/templates';

export async function GET() {
  return Response.json({ templates: PROJECT_TEMPLATES });
}
