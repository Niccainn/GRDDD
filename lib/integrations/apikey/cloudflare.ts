/**
 * Cloudflare API-token provider. Users create a scoped API token in
 * their Cloudflare dashboard and paste it into the connect modal;
 * we validate it with a /user/tokens/verify call before persisting
 * so we never store an invalid token. After validation we fetch the
 * first accessible account to populate accountLabel.
 *
 * No OAuth here — Cloudflare's OAuth is limited to Apps marketplace
 * and API tokens are the recommended path for programmatic access.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

export type CloudflareTokenVerifyResult = {
  id: string;
  status: 'active' | 'disabled' | 'expired';
};

export type CloudflareAccount = {
  id: string;
  name: string;
};

/**
 * Ping Cloudflare with the token to confirm it's valid. Returns the
 * token id + status so callers can surface useful feedback. Throws
 * on any non-success so the route handler can translate into a 400.
 */
export async function verifyCloudflareToken(token: string): Promise<CloudflareTokenVerifyResult> {
  const res = await fetch(`${API_BASE}/user/tokens/verify`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = (await res.json()) as {
    success: boolean;
    errors?: { message: string }[];
    result?: { id: string; status: string };
  };
  if (!res.ok || !payload.success || !payload.result) {
    const msg = payload.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare token rejected: ${msg}`);
  }
  return {
    id: payload.result.id,
    status: payload.result.status as CloudflareTokenVerifyResult['status'],
  };
}

/**
 * List accessible Cloudflare accounts so we can stamp accountLabel on
 * the Integration row. Single-account users will see just one entry;
 * agency users who manage many accounts can be prompted to pick one.
 */
export async function listCloudflareAccounts(token: string): Promise<CloudflareAccount[]> {
  const res = await fetch(`${API_BASE}/accounts?per_page=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = (await res.json()) as {
    success: boolean;
    errors?: { message: string }[];
    result?: { id: string; name: string }[];
  };
  if (!res.ok || !payload.success) {
    const msg = payload.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Failed to list Cloudflare accounts: ${msg}`);
  }
  return payload.result ?? [];
}

/**
 * Quick health check invoked by /api/integrations/[id]/test. Returns
 * the token status + account count — anything more would burn rate
 * limit budget unnecessarily.
 */
export async function testCloudflareConnection(token: string): Promise<{
  ok: true;
  tokenStatus: string;
  accountCount: number;
  firstAccount?: CloudflareAccount;
}> {
  const verify = await verifyCloudflareToken(token);
  const accounts = await listCloudflareAccounts(token);
  return {
    ok: true,
    tokenStatus: verify.status,
    accountCount: accounts.length,
    firstAccount: accounts[0],
  };
}
