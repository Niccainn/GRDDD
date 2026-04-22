/**
 * GET /api/skills/space
 *
 * The full combinatorial surface filtered to what's actually
 * runnable right now. For each Location × Action pair that has
 * executor coverage, return (location, action, defaultInteraction,
 * defaultExecution, status). Optional ?connected=1 filters to only
 * locations whose integration is connected.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { LOCATIONS, type Location, type Action } from '@/lib/skills/taxonomy';
import { SKILLS } from '@/lib/skills/registry';

type SkillCell = {
  location: Location;
  action: Action;
  title: string;
  description: string;
  status: 'available' | 'partial' | 'planned';
  requiresApproval: boolean;
  connected?: boolean;
};

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const filterConnected = req.nextUrl.searchParams.get('connected') === '1';

  // Derive a connected-integration set for this identity so the
  // browser can tell the user "you'd need Figma connected to unlock
  // these 8 combinations."
  const integrations = await prisma.integration.findMany({
    where: { environment: { ownerId: identity.id }, deletedAt: null },
    select: { provider: true, status: true, credentialsEnc: true },
  });
  // "Connected" = has credentials and isn't flagged error/revoked.
  const connectedSet = new Set(
    integrations
      .filter(i => Boolean(i.credentialsEnc) && !['error', 'revoked', 'disconnected'].includes(i.status))
      .map(i => i.provider.toLowerCase()),
  );
  // Claude + human surfaces are always "connected" conceptually.
  connectedSet.add('claude_reasoning');
  connectedSet.add('human_decision');
  connectedSet.add('grid_internal');

  const cells: SkillCell[] = [];
  for (const s of SKILLS) {
    const location = (s.tool === 'claude'
      ? 'claude_reasoning'
      : s.tool === 'human'
      ? 'human_decision'
      : s.tool) as Location;
    const action = inferAction(s.id);
    const connected = connectedSet.has(location);
    if (filterConnected && !connected) continue;
    cells.push({
      location,
      action,
      title: s.title,
      description: s.description,
      status: s.status,
      requiresApproval: Boolean(s.requiresApprovalByDefault),
      connected,
    });
  }

  // Compute a summary: locations total vs connected.
  const locationsTotal = LOCATIONS.length;
  const locationsConnected = LOCATIONS.filter(l => connectedSet.has(l)).length;

  return Response.json({
    cells,
    summary: {
      locationsTotal,
      locationsConnected,
      cellsTotal: cells.length,
      availableCount: cells.filter(c => c.status === 'available').length,
      plannedCount: cells.filter(c => c.status === 'planned').length,
    },
  });
}

function inferAction(skillId: string): Action {
  const p = skillId.split('.')[1] ?? '';
  if (p.includes('fetch')) return 'fetch';
  if (p.includes('export')) return 'export';
  if (p.includes('upload')) return 'upload';
  if (p.includes('summarize') || p.includes('compose') || p.includes('draft_copy')) return 'compose';
  if (p.includes('review')) return 'review';
  if (p.includes('post')) return 'publish';
  if (p.includes('email') || p.includes('send')) return 'send';
  if (p.includes('schedule')) return 'schedule';
  return 'create';
}
