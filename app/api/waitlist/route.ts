import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

// POST — add email to waitlist (public)
export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

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
