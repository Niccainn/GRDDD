import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(keys.map(k => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    isActive: k.isActive,
    lastUsed: k.lastUsed?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { name, expiresInDays } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const { key, hash, prefix } = generateApiKey();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      isActive: true,
      expiresAt,
      identityId: identity?.id ?? null,
    },
  });

  audit({
    action: 'webhook.created', // reuse for API key context
    entity: 'ApiKey',
    entityName: name.trim(),
    actorId: identity?.id,
    actorName: identity?.name,
  });

  // Return the raw key ONCE — never stored
  return Response.json({ key, prefix }, { status: 201 });
}
