/**
 * GET /api/traces
 *
 * Lists recent KernelTrace records for the authenticated tenant.
 * Supports filtering by environment, system, and surface.
 *
 * This is the read side of observability — every kernel run (chat,
 * workflow, scheduler, webhook) shows up here with full fidelity.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { listTraces } from '@/lib/kernel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);

  const traces = await listTraces({
    tenantId: identity.id,
    environmentId: searchParams.get('environmentId') ?? undefined,
    systemId: searchParams.get('systemId') ?? undefined,
    surface: searchParams.get('surface') ?? undefined,
    limit: Number(searchParams.get('limit') ?? 50),
  });

  return Response.json({ traces });
}
