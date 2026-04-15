/**
 * Stripe API-key provider. Users paste a restricted/secret key from
 * the Stripe dashboard. We validate with GET /v1/account and use the
 * account id + business name for accountLabel + displayName.
 */

const API_BASE = 'https://api.stripe.com/v1';

export async function testStripeKey(secretKey: string): Promise<{
  ok: true;
  accountId: string;
  businessName: string | null;
  country: string | null;
}> {
  const res = await fetch(`${API_BASE}/account`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe key rejected: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    id: string;
    business_profile?: { name?: string };
    settings?: { dashboard?: { display_name?: string } };
    country?: string;
  };
  return {
    ok: true,
    accountId: data.id,
    businessName: data.business_profile?.name ?? data.settings?.dashboard?.display_name ?? null,
    country: data.country ?? null,
  };
}
