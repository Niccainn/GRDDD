import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

const BRAND_FIELDS = [
  'brandName',
  'brandColor',
  'brandLogo',
  'brandTone',
  'brandAudience',
  'brandValues',
  'brandKeywords',
  'brandVoiceDont',
  'brandBio',
] as const;

async function findPrimaryEnvironment(identityId: string) {
  return prisma.environment.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId: identityId } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const env = await findPrimaryEnvironment(identity.id);
  if (!env) {
    return Response.json({ error: 'No environment found' }, { status: 404 });
  }

  return Response.json({
    environmentId: env.id,
    environmentName: env.name,
    brandName: env.brandName ?? null,
    brandColor: env.brandColor ?? null,
    brandLogo: env.brandLogo ?? null,
    brandTone: env.brandTone ?? null,
    brandAudience: env.brandAudience ?? null,
    brandValues: env.brandValues ?? null,
    brandKeywords: env.brandKeywords ?? null,
    brandVoiceDont: env.brandVoiceDont ?? null,
    brandBio: env.brandBio ?? null,
  });
}

export async function PATCH(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const env = await findPrimaryEnvironment(identity.id);
  if (!env) {
    return Response.json({ error: 'No environment found' }, { status: 404 });
  }

  const body = await req.json();

  const data: Record<string, string | null> = {};
  for (const field of BRAND_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No valid brand fields provided' }, { status: 400 });
  }

  const updated = await prisma.environment.update({
    where: { id: env.id },
    data,
  });

  return Response.json({
    environmentId: updated.id,
    environmentName: updated.name,
    brandName: updated.brandName ?? null,
    brandColor: updated.brandColor ?? null,
    brandLogo: updated.brandLogo ?? null,
    brandTone: updated.brandTone ?? null,
    brandAudience: updated.brandAudience ?? null,
    brandValues: updated.brandValues ?? null,
    brandKeywords: updated.brandKeywords ?? null,
    brandVoiceDont: updated.brandVoiceDont ?? null,
    brandBio: updated.brandBio ?? null,
  });
}
