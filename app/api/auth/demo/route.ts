/**
 * POST /api/auth/demo  —  DEV-ONLY sandbox sign-in.
 *
 * SECURITY POSTURE:
 *   - This route is disabled in production by default.
 *   - Enabled only when NODE_ENV !== 'production' OR the opt-in
 *     environment variable GRID_ENABLE_DEMO === '1' is set.
 *   - Production public traffic must NEVER see this endpoint.
 *
 * Historical note: an earlier version of this route used a single
 * shared demo@grid.app identity, which would have been a GDPR Art. 32
 * integrity violation in production (all demo users could read each
 * other's data). Demo is now scoped to developer use on localhost
 * and explicitly blocked in prod.
 */
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { createSessionForIdentity } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { isDemoEnabled } from '@/lib/feature-flags';

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  if (!isDemoEnabled()) {
    return Response.json(
      { error: 'Demo sign-in is not available.' },
      { status: 404 }
    );
  }

  // Rate limit even in dev so local test loops can't DOS the DB.
  const ip = clientIp(req);
  const rl = rateLimit(`demo:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many demo workspaces from this address.' },
      { status: 429 }
    );
  }

  try {
    const suffix = crypto.randomBytes(6).toString('hex');
    const email = `demo-${suffix}@sandbox.grid.local`;
    const identity = await prisma.identity.create({
      data: {
        type: 'PERSON',
        name: `Dev sandbox · ${suffix.slice(0, 4)}`,
        email,
        // No passwordHash — sandbox identities cannot be signed back into.
        metadata: JSON.stringify({
          sandbox: true,
          devOnly: true,
          createdFromIp: ip,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    await createSessionForIdentity(identity.id);

    return Response.json({
      success: true,
      identity: { id: identity.id, name: identity.name, email: identity.email },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demo sign-in failed';
    console.error('[auth.demo]', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
