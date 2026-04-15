/**
 * BYOK — Anthropic API key management for a single environment.
 *
 * The plaintext key never lives in the DB, logs, or error messages.
 * On POST we validate the key with a 1-token Haiku ping against the
 * user's own account, then AES-256-GCM encrypt it at rest. On GET we
 * return only the masked preview + provenance so the UI can confirm
 * "sk-ant-...a7f3" is connected without decrypting. On DELETE we wipe
 * all three columns in one write.
 *
 * Authorization: the caller must either own the environment or hold
 * an ADMIN membership. CONTRIBUTORs and VIEWERs cannot change billing.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptString, buildKeyPreview } from '@/lib/crypto/key-encryption';
import { validateAnthropicKey } from '@/lib/nova/client-factory';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Look up an environment the identity is allowed to administer. Owner
 * always qualifies; otherwise an ADMIN membership qualifies. Returns
 * null on any miss so the caller can respond with a generic 404 and
 * avoid leaking existence.
 */
async function getAdministrableEnvironment(environmentId: string, identityId: string) {
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId, role: 'ADMIN' } } },
      ],
    },
    select: {
      id: true,
      name: true,
      anthropicKeyPreview: true,
      anthropicKeyAddedAt: true,
      anthropicKeySource: true,
      anthropicKeyEnc: true,
    },
  });
  return env;
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    environmentId: env.id,
    environmentName: env.name,
    connected: Boolean(env.anthropicKeyEnc),
    preview: env.anthropicKeyPreview,
    addedAt: env.anthropicKeyAddedAt,
    source: env.anthropicKeySource,
  });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { environmentId?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { environmentId, apiKey } = body;
  if (!environmentId || !apiKey) {
    return Response.json({ error: 'environmentId and apiKey required' }, { status: 400 });
  }

  // Cheap shape check before hitting the Anthropic API. Real keys
  // start with "sk-ant-" — reject anything else immediately so we
  // don't burn a network round-trip on an obvious paste error.
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith('sk-ant-') || trimmed.length < 20) {
    return Response.json(
      { error: 'That does not look like an Anthropic API key. Keys start with "sk-ant-".' },
      { status: 400 },
    );
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  // Validate the key against the Anthropic API BEFORE storing it.
  // A 1-token Haiku ping costs fractions of a cent on the USER's key,
  // and confirms (a) valid format, (b) live/not-revoked, (c) has quota.
  try {
    await validateAnthropicKey(trimmed);
  } catch (err) {
    // Pass Anthropic's own error message through verbatim so the user
    // sees e.g. "invalid x-api-key" vs "credit balance too low" and
    // knows exactly what to fix upstream.
    const message =
      err instanceof Anthropic.APIError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown error validating key';
    return Response.json({ error: `Key rejected by Anthropic: ${message}` }, { status: 400 });
  }

  const ciphertext = encryptString(trimmed);
  const preview = buildKeyPreview(trimmed);

  await prisma.environment.update({
    where: { id: environmentId },
    data: {
      anthropicKeyEnc: ciphertext,
      anthropicKeyPreview: preview,
      anthropicKeyAddedAt: new Date(),
      anthropicKeySource: 'byok',
    },
  });

  return Response.json({
    connected: true,
    preview,
    source: 'byok',
  });
}

export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.environment.update({
    where: { id: environmentId },
    data: {
      anthropicKeyEnc: null,
      anthropicKeyPreview: null,
      anthropicKeyAddedAt: null,
      anthropicKeySource: null,
    },
  });

  return Response.json({ connected: false });
}
