/**
 * /api/integrations
 *
 * GET  — list integrations for an environment (viewer+).
 * POST — connect a new api_key-auth integration (admin-only). OAuth
 *        integrations go through /api/integrations/oauth/[provider]/
 *        start + callback instead.
 *
 * POST accepts: { environmentId, provider, credentials, displayName?,
 * accountLabel? }. `credentials` is the raw key material the user
 * pasted — we validate with the provider, encrypt, then discard the
 * plaintext. The server NEVER persists the raw credentials or logs
 * them, matching the BYOK Anthropic pattern.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptString, buildKeyPreview } from '@/lib/crypto/key-encryption';
import { findProvider } from '@/lib/integrations/registry';
import { getAdministrableEnvironment, getReadableEnvironment } from '@/lib/integrations/access';
import { testCloudflareConnection } from '@/lib/integrations/apikey/cloudflare';
import { testStripeKey } from '@/lib/integrations/apikey/stripe';
import { testShopifyCredentials } from '@/lib/integrations/apikey/shopify';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId query param required' }, { status: 400 });
  }
  const env = await getReadableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const rows = await prisma.integration.findMany({
    where: { environmentId, deletedAt: null },
    orderBy: [{ provider: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      provider: true,
      displayName: true,
      accountLabel: true,
      authType: true,
      credentialsPreview: true,
      scopes: true,
      status: true,
      lastSyncedAt: true,
      lastError: true,
      lastErrorAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return Response.json({ environmentId, integrations: rows });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    environmentId?: string;
    provider?: string;
    credentials?: Record<string, string>;
    displayName?: string;
    accountLabel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { environmentId, provider, credentials } = body;
  if (!environmentId || !provider || !credentials) {
    return Response.json(
      { error: 'environmentId, provider, and credentials are required' },
      { status: 400 },
    );
  }

  const env = await getAdministrableEnvironment(environmentId, identity.id);
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const def = findProvider(provider);
  if (!def) return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  if (!def.implemented) {
    return Response.json({ error: `${def.name} is not yet implemented` }, { status: 400 });
  }
  if (def.authType !== 'api_key') {
    return Response.json(
      { error: `${def.name} uses ${def.authType} — start the flow at /api/integrations/oauth/${provider}/start` },
      { status: 400 },
    );
  }

  // Provider-specific validation + account label resolution. Each
  // api_key provider lives in lib/integrations/apikey/<id>.ts. We
  // switch here rather than lookup-table so TypeScript can narrow
  // the credential shape per provider.
  let resolvedAccountLabel = body.accountLabel;
  let resolvedDisplayName = body.displayName;
  try {
    if (provider === 'cloudflare') {
      const token = credentials.apiToken;
      if (!token) return Response.json({ error: 'apiToken is required' }, { status: 400 });
      const result = await testCloudflareConnection(token);
      resolvedAccountLabel = resolvedAccountLabel ?? result.firstAccount?.id ?? 'unknown';
      resolvedDisplayName = resolvedDisplayName ?? `Cloudflare · ${result.firstAccount?.name ?? 'token'}`;
    } else if (provider === 'stripe') {
      const secretKey = credentials.secretKey;
      if (!secretKey) return Response.json({ error: 'secretKey is required' }, { status: 400 });
      const result = await testStripeKey(secretKey);
      resolvedAccountLabel = resolvedAccountLabel ?? result.accountId;
      resolvedDisplayName = resolvedDisplayName ?? `Stripe · ${result.businessName ?? result.accountId}`;
    } else if (provider === 'shopify') {
      const { shopDomain, accessToken } = credentials;
      if (!shopDomain || !accessToken) {
        return Response.json({ error: 'shopDomain and accessToken are required' }, { status: 400 });
      }
      const result = await testShopifyCredentials(shopDomain, accessToken);
      resolvedAccountLabel = resolvedAccountLabel ?? String(result.shopId);
      resolvedDisplayName = resolvedDisplayName ?? `Shopify · ${result.shopName}`;
    } else {
      return Response.json({ error: `No api_key handler for ${provider}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error validating credentials';
    return Response.json({ error: message }, { status: 400 });
  }

  // Encrypt the whole credentials object as JSON. Keeping it
  // structured (rather than a single raw string) lets providers that
  // need multiple fields — e.g. Shopify's shopDomain + accessToken —
  // use the same storage shape as single-token providers like
  // Cloudflare. Only the `credentialsPreview` surface leaks into UI.
  const credsJson = JSON.stringify(credentials);
  const ciphertext = encryptString(credsJson);
  const previewSource = credentials.apiToken ?? credentials.accessToken ?? Object.values(credentials)[0] ?? '';
  const preview = buildKeyPreview(previewSource);

  // Manual upsert — Prisma's compound unique with a nullable column
  // gets flaky under SQLite, so we check-then-write instead.
  const existing = await prisma.integration.findFirst({
    where: {
      environmentId,
      provider,
      accountLabel: resolvedAccountLabel ?? null,
      deletedAt: null,
    },
    select: { id: true },
  });

  const selectFields = {
    id: true,
    provider: true,
    displayName: true,
    accountLabel: true,
    authType: true,
    credentialsPreview: true,
    status: true,
    lastSyncedAt: true,
  } as const;

  const created = existing
    ? await prisma.integration.update({
        where: { id: existing.id },
        data: {
          displayName: resolvedDisplayName ?? def.name,
          credentialsEnc: ciphertext,
          credentialsPreview: preview,
          status: 'ACTIVE',
          lastError: null,
          lastErrorAt: null,
          lastSyncedAt: new Date(),
        },
        select: selectFields,
      })
    : await prisma.integration.create({
        data: {
          environmentId,
          provider,
          displayName: resolvedDisplayName ?? def.name,
          accountLabel: resolvedAccountLabel,
          authType: 'api_key',
          credentialsEnc: ciphertext,
          credentialsPreview: preview,
          scopes: JSON.stringify(def.scopes),
          status: 'ACTIVE',
          lastSyncedAt: new Date(),
          createdById: identity.id,
        },
        select: selectFields,
      });

  return Response.json({ integration: created });
}
