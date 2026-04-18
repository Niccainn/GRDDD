import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { generatePlaybook } from '@/lib/intelligence/playbook-generator';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Verify access
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  // Check for existing playbook
  const existing = await prisma.operationalPlaybook.findUnique({
    where: { environmentId },
  });

  if (existing && !existing.stale) {
    return Response.json({
      playbook: JSON.parse(existing.content),
      version: existing.version,
      runsAnalyzed: existing.runsAnalyzed,
      insightsUsed: existing.insightsUsed,
      improvementRate: existing.improvementRate,
      lastGeneratedAt: existing.lastGeneratedAt,
      stale: false,
    });
  }

  // No playbook or stale — check if we have enough data
  const reviewCount = await prisma.executionReview.count({
    where: { environmentId },
  });

  if (reviewCount < 5) {
    return Response.json({
      ready: false,
      reviewCount,
      minimumRequired: 5,
      message: `Need ${5 - reviewCount} more reviewed runs to generate your operational playbook`,
    });
  }

  // Generate fresh playbook
  const result = await generatePlaybook(environmentId);

  return Response.json({
    playbook: result.content,
    version: 1,
    runsAnalyzed: result.runsAnalyzed,
    insightsUsed: result.insightsUsed,
    lastGeneratedAt: new Date().toISOString(),
    stale: false,
  });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { environmentId } = body;

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const result = await generatePlaybook(environmentId);

  return Response.json({
    generated: true,
    runsAnalyzed: result.runsAnalyzed,
    insightsUsed: result.insightsUsed,
  }, { status: 201 });
}
