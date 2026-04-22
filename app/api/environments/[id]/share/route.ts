/**
 * POST /api/environments/[id]/share — generate a signed, time-boxed
 * public share URL for an Environment. Owner-only.
 *
 * Body (optional): { ttlDays?: number } — default 30, max 365.
 * Response: { url, expiresAt }
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { signShareToken, shareUrl } from '@/lib/public-share';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: envId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({} as { ttlDays?: number }));
  const ttlDaysRaw = typeof body?.ttlDays === 'number' ? body.ttlDays : 30;
  const ttlDays = Math.min(Math.max(ttlDaysRaw, 1), 365);

  try {
    const { token, expiresAt } = signShareToken('environment', env.id, ttlDays * MS_PER_DAY);
    const origin = req.nextUrl.origin;
    const url = shareUrl(origin, 'environment', env.id, token);
    return Response.json({ url, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Share unavailable';
    return Response.json({ error: msg }, { status: 503 });
  }
}
