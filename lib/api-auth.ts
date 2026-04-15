/**
 * API key authentication for /api/v1/* endpoints.
 * Extracts and validates the Bearer token, updates lastUsed, and
 * returns the resolved API key row (with environmentId for scoping).
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashApiKey } from '@/lib/api-keys';
import { rateLimitApi } from '@/lib/rate-limit';

export type ApiKeyIdentity = {
  id: string;
  name: string;
  identityId: string | null;
  environmentId: string | null;
};

/**
 * Authenticate an API request via Bearer token.
 * Returns the API key record or throws a Response.
 */
export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyIdentity> {
  const authHeader = req.headers.get('authorization') ?? '';
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!rawKey) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization: Bearer <key> header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.isActive) {
    throw new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new Response(JSON.stringify({ error: 'API key expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: 120 req/min per key
  const rl = rateLimitApi(apiKey.id);
  if (!rl.allowed) {
    throw new Response(JSON.stringify({ error: 'Rate limited', retryAfter: 60 }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  // Fire-and-forget lastUsed update
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return {
    id: apiKey.id,
    name: apiKey.name,
    identityId: apiKey.identityId,
    environmentId: apiKey.environmentId,
  };
}
