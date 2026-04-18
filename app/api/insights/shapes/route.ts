/**
 * Cross-tenant shape abstraction library — GATED.
 *
 * ShapeAbstraction rows store aggregate scaffolding stats per
 * business shape ("creative_agency_small", "saas_startup", …). Future
 * scaffolds for the same shape get a smarter first-draft.
 *
 * All rows are currently written with `gated=true`. This endpoint
 * refuses to return anything while gated — flip rows to `gated=false`
 * only after the privacy/legal pass documented in
 * docs/BETA_TESTING.md promotion criteria.
 *
 * Why ship the route now if it's gated? So the client-side code path
 * can be written and tested against a real endpoint, and the row
 * shape is fixed before the first data write. This is safer than
 * adding the route alongside legal signoff in one rushed step later.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const shape = searchParams.get('shape') ?? undefined;

  const rows = await prisma.shapeAbstraction.findMany({
    where: {
      gated: false, // HARD GATE — nothing is ungated until legal review lands
      ...(shape ? { shape } : {}),
    },
    orderBy: { sampleSize: 'desc' },
    take: 20,
  });

  // Shape of response is intentionally final — client-side
  // consumers can wire against this now without waiting for rows.
  return Response.json({
    shapes: rows.map(r => ({
      shape: r.shape,
      headcount: r.headcount,
      medianSystems: r.medianSystems,
      commonWidgets: safeParseArray(r.commonWidgets),
      commonIntegrations: safeParseArray(r.commonIntegrations),
      sampleSize: r.sampleSize,
    })),
    gated: rows.length === 0,
    note:
      'Cross-tenant shape library is gated pending privacy review. Routes respond with the final shape; data flow opens post-review.',
  });
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
