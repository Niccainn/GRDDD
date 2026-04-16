/**
 * Shopify OAuth provider.
 *
 * Shopify is non-standard in that the authorize + token URLs are
 * per-shop: https://{shop}.myshopify.com/admin/oauth/authorize. The
 * shop domain must come from a query param in the /start route, then
 * gets stashed in the state cookie so /callback can reconstruct the
 * token URL.
 *
 * Because the URLs are dynamic, SHOPIFY_PROVIDER uses a placeholder
 * that callers must replace via `shopifyProvider(shop)`.
 *
 * Scopes: read_orders, read_products, read_customers, read_inventory.
 */

import type { OAuthProvider, TokenResponse } from './base';
import { buildRedirectUri } from './base';

/** Baseline provider — callers must call `shopifyProvider(shop)` to fill in shop-specific URLs. */
export const SHOPIFY_PROVIDER: OAuthProvider = {
  id: 'shopify',
  authorizeUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
  tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
  clientIdEnv: 'SHOPIFY_CLIENT_ID',
  clientSecretEnv: 'SHOPIFY_CLIENT_SECRET',
  scopeSeparator: ',',
};

/** Build a shop-specific OAuthProvider with the correct URLs. */
export function shopifyProvider(shop: string): OAuthProvider {
  const domain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  return {
    ...SHOPIFY_PROVIDER,
    authorizeUrl: `https://${domain}/admin/oauth/authorize`,
    tokenUrl: `https://${domain}/admin/oauth/access_token`,
  };
}

/**
 * Build the Shopify authorize URL manually since the base helper
 * can't handle the dynamic shop domain.
 */
export function buildShopifyAuthorizeUrl(shop: string, scopes: string[], state: string): string {
  const provider = shopifyProvider(shop);
  const clientId = process.env[provider.clientIdEnv];
  if (!clientId) throw new Error(`Missing required env var: ${provider.clientIdEnv}`);
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes.join(','),
    redirect_uri: buildRedirectUri('shopify'),
    state,
  });
  return `${provider.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange an authorization code for a permanent Shopify access token.
 * Shopify tokens don't expire — there's no refresh_token.
 */
export async function completeShopifyOAuth(
  shop: string,
  code: string,
): Promise<TokenResponse> {
  const provider = shopifyProvider(shop);
  const clientId = process.env[provider.clientIdEnv];
  const clientSecret = process.env[provider.clientSecretEnv];
  if (!clientId) throw new Error(`Missing required env var: ${provider.clientIdEnv}`);
  if (!clientSecret) throw new Error(`Missing required env var: ${provider.clientSecretEnv}`);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });
  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Fetch basic shop info for the display name. */
export async function getShopInfo(
  shop: string,
  accessToken: string,
): Promise<{ name: string; domain: string; email: string }> {
  const domain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  const res = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Shopify shop.json failed (${res.status})`);
  const data = (await res.json()) as { shop: { name: string; domain: string; email: string } };
  return data.shop;
}
