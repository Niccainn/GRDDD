/**
 * GET /api/workflows/marketplace/:slug
 *
 * Returns the full WorkflowSpec for a single entry — stages and all.
 * Used by the workflow detail page and by external tools that want
 * to introspect a spec before running it.
 */
import { getAuthIdentityOrNull } from '@/lib/auth';
import { getWorkflow } from '@/lib/workflows';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const spec = getWorkflow(slug);
  if (!spec) {
    return Response.json({ error: 'Workflow not found' }, { status: 404 });
  }
  return Response.json({ spec });
}
