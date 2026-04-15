/**
 * Shopify API-key provider. Users create a custom app in their
 * Shopify admin, grant it the necessary read scopes, and paste the
 * Admin API access token. The shop domain (`acme.myshopify.com`) is
 * required because Shopify's API is per-shop, not global.
 */

export async function testShopifyCredentials(
  shopDomain: string,
  accessToken: string,
): Promise<{ ok: true; shopName: string; shopId: number; currency: string }> {
  const normalizedDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${normalizedDomain}/admin/api/2024-07/shop.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify credentials rejected: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { shop: { id: number; name: string; currency: string } };
  return { ok: true, shopName: data.shop.name, shopId: data.shop.id, currency: data.shop.currency };
}
