/**
 * GET /api/auth/providers
 *
 * Lightweight discovery: returns which auth pathways are available.
 * Used by the sign-in/sign-up pages to decide which buttons to render.
 */
import { enabledProviders } from '@/lib/oauth';
import { isDemoEnabled } from '@/lib/feature-flags';

export async function GET() {
  return Response.json({
    oauth: enabledProviders(),
    demo: isDemoEnabled(), // dev-only by default; gated by NODE_ENV + GRID_ENABLE_DEMO
    password: true,
  });
}
