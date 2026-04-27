/**
 * GET /api/integrations/health
 *
 * Quick visibility into integration-layer state:
 *   - liveWritesEnabled — is NOVA_TOOLS_LIVE=1 set on this server?
 *     When false, every Nova write tool returns a simulated success
 *     instead of actually calling the provider API. This is the
 *     single most important fact for a user evaluating "did Nova
 *     actually post to Slack?". Surface it on /integrations.
 *   - implementedCount — providers with shipped adapters
 *   - totalProviders — registry size
 *   - oauthHandlerCount — providers with a working OAuth start
 *     route handler
 *
 * Auth-required — middleware gates all /api/* routes. Adequate
 * since the consumers are signed-in users on /integrations who
 * already need to see this for context.
 */

import { isLiveToolsEnabled } from '@/lib/nova/tools/dispatch';
import { PROVIDERS } from '@/lib/integrations/registry';
import { INTEGRATION_CATALOG } from '@/lib/integrations/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const total = PROVIDERS.length;
  const implemented = PROVIDERS.filter(p => p.implemented).length;
  const oauth = PROVIDERS.filter(
    p => p.implemented && p.authType === 'oauth',
  ).length;
  const apiKey = PROVIDERS.filter(
    p => p.implemented && p.authType === 'api_key',
  ).length;

  return Response.json({
    liveWritesEnabled: isLiveToolsEnabled(),
    totalProviders: total,
    implementedCount: implemented,
    notYetImplemented: total - implemented,
    catalogEntries: Object.keys(INTEGRATION_CATALOG).length,
    byAuthType: {
      oauth,
      apiKey,
    },
    notes: {
      simulationMode: !isLiveToolsEnabled()
        ? 'Nova write tools return simulated success without calling provider APIs. Set NOVA_TOOLS_LIVE=1 to enable real writes.'
        : null,
    },
  });
}
