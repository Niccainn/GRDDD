/**
 * Shared loader for Google integration clients. Handles:
 *
 *   - Decrypting the stored access token + refresh token.
 *   - Refreshing the access token lazily if it's expired (or within
 *     60 seconds of expiring) and persisting the new token back to
 *     the DB so subsequent calls don't re-refresh.
 *   - Returning a ready-to-use Authorization header.
 *
 * Each Google surface (ads, analytics, search console, workspace)
 * uses this loader and then layers its own API calls on top. Keeps
 * the token-refresh logic in exactly one place instead of four.
 */

import type { Integration } from '@prisma/client';
import type { OAuthProvider } from '../oauth/base';
import { prisma } from '@/lib/db';
import { decryptString, encryptString } from '@/lib/crypto/key-encryption';
import { refreshGoogleAccessToken } from '../oauth/google';

type GoogleCreds = { accessToken: string };

const REFRESH_SKEW_MS = 60 * 1000;

export async function loadGoogleIntegration(
  integrationId: string,
  environmentId: string,
  provider: string,
): Promise<Integration> {
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      environmentId,
      provider,
      deletedAt: null,
      status: 'ACTIVE',
    },
  });
  if (!integration) throw new Error(`${provider} integration not found or not active`);
  return integration;
}

/**
 * Return a fresh access token for a Google integration, refreshing
 * from the stored refresh token if the current one is expired.
 * Returns the token string ready to drop into an Authorization header.
 */
export async function getGoogleAccessToken(
  integration: Integration,
  providerDef: OAuthProvider,
): Promise<string> {
  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GoogleCreds;
  const notExpired =
    integration.expiresAt && integration.expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS;
  if (notExpired) return creds.accessToken;

  if (!integration.refreshTokenEnc) {
    // No refresh token stored — either user connected before we
    // started requesting one, or provider never issued one. Return
    // the current token and let the call fail with a clear 401 if
    // it's dead.
    return creds.accessToken;
  }

  const refreshToken = decryptString(integration.refreshTokenEnc);
  const refreshed = await refreshGoogleAccessToken(providerDef, refreshToken);
  const newAccessToken = refreshed.access_token;
  const newExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;

  // Persist the rotated token so the next call doesn't refresh again.
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      credentialsEnc: encryptString(JSON.stringify({ accessToken: newAccessToken })),
      expiresAt: newExpiresAt,
      lastSyncedAt: new Date(),
    },
  });

  return newAccessToken;
}

/** Build the standard Google Authorization headers. */
export function googleAuthHeaders(accessToken: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(extra ?? {}),
  };
}
