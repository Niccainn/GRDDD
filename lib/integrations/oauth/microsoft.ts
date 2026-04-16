/**
 * Microsoft OAuth — Azure AD v2.0 endpoint for Outlook Calendar.
 *
 * Uses the "common" tenant so any Microsoft account (personal or
 * work/school) can connect. The scopes requested are read-only
 * calendar access + basic profile (User.Read for accountLabel).
 *
 * Requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET from an
 * Azure AD app registration with the "Web" redirect platform
 * configured to:
 *   https://<your-domain>/api/integrations/oauth/microsoft_outlook/callback
 */

import type { OAuthProvider } from './base';

export const MICROSOFT_OUTLOOK_PROVIDER: OAuthProvider = {
  id: 'microsoft_outlook',
  authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  clientIdEnv: 'MICROSOFT_CLIENT_ID',
  clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  scopeSeparator: ' ',
  extraAuthorizeParams: {
    response_mode: 'query',
    prompt: 'consent',
  },
};

/** Fetch the signed-in user's profile (displayName + email). */
export async function getMicrosoftUser(accessToken: string): Promise<{
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph /me failed (${res.status}): ${text}`);
  }
  return (await res.json()) as {
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
  };
}
