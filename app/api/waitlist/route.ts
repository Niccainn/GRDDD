import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Client IP resolution behind Vercel / generic proxies. Trust the
 * left-most entry in X-Forwarded-For (per Vercel's docs — it's the
 * originating client). Falls back to X-Real-IP, then "unknown" which
 * gets its own bucket (generous but better than no limit).
 */
function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// POST — add email to waitlist (public, rate-limited per IP + per email)
export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Per-IP: 5 submissions per 15 min (stops botnet email harvesting).
    const ip = clientIp(req);
    const rlIp = rateLimit(`waitlist-ip:${ip}`, 5, 15 * 60_000);
    if (!rlIp.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
    }

    // Per-email: 3 per hour (stops spam upserts on the same row).
    const rlEmail = rateLimit(`waitlist-email:${normalized}`, 3, 60 * 60_000);
    if (!rlEmail.allowed) {
      return NextResponse.json({ error: "You're already on the list." }, { status: 429 });
    }

    const entry = await prisma.waitlistEntry.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, source: source || 'landing' },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch {
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

// GET — list waitlist entries (admin only — must own at least one environment)
export async function GET() {
  const identity = await getAuthIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only environment owners can view waitlist data
  const ownsEnv = await prisma.environment.findFirst({
    where: { ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!ownsEnv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(entries);
}
