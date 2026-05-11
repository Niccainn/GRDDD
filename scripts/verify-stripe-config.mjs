#!/usr/bin/env node
/**
 * Stripe configuration verifier — runs the four sanity checks that
 * separate "Stripe is wired" from "Stripe will explode at checkout."
 *
 * Why this exists:
 *   The billing path lives behind sign-up + a real Stripe call, so
 *   the first time a customer hits "Start subscription" is the first
 *   time the prod env vars get exercised end-to-end. By then it's a
 *   support ticket, not a config typo. Run this before flipping
 *   GRID_BETA_TIER=live to catch the obvious failure modes:
 *
 *     1. STRIPE_SECRET_KEY is set and reaches Stripe (auth works)
 *     2. The key matches the deployment's tier (live key on `live`,
 *        test key everywhere else — same guardrail the API enforces)
 *     3. STRIPE_PRO_PRICE_ID and STRIPE_TEAM_PRICE_ID resolve to
 *        actual Price objects in the same Stripe account
 *     4. STRIPE_WEBHOOK_SECRET is set (we can't verify it from here,
 *        but missing it guarantees prod webhooks 500)
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_… STRIPE_PRO_PRICE_ID=price_… \
 *   STRIPE_TEAM_PRICE_ID=price_… STRIPE_WEBHOOK_SECRET=whsec_… \
 *   GRID_BETA_TIER=byok \
 *     node scripts/verify-stripe-config.mjs
 *
 * Exit code 0 = ready to flip the tier. Non-zero = fix what it tells
 * you, run again.
 */

import Stripe from 'stripe';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

let failures = 0;
function fail(msg) {
  console.error(`${RED}✗${RESET} ${msg}`);
  failures += 1;
}
function pass(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}
function note(msg) {
  console.log(`${DIM}  ${msg}${RESET}`);
}
function warn(msg) {
  console.warn(`${YELLOW}⚠${RESET}  ${msg}`);
}

const tier = (process.env.GRID_BETA_TIER ?? 'closed').toLowerCase().trim();
if (!['closed', 'byok', 'live'].includes(tier)) {
  fail(`GRID_BETA_TIER='${tier}' is not one of closed | byok | live`);
}

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID;

console.log(`Tier: ${tier}`);
console.log('');

// 1. Secret key present + tier-matched
if (!secretKey) {
  fail('STRIPE_SECRET_KEY is unset');
} else if (tier !== 'live' && secretKey.startsWith('sk_live_')) {
  fail(`Tier '${tier}' rejects sk_live_* keys (would create real charges in beta)`);
} else if (tier === 'live' && !secretKey.startsWith('sk_live_')) {
  warn(`Tier 'live' usually wants sk_live_*. Got ${secretKey.slice(0, 8)}…`);
} else if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
  fail(`STRIPE_SECRET_KEY doesn't look like a Stripe key (got ${secretKey.slice(0, 12)}…)`);
} else {
  pass(`STRIPE_SECRET_KEY shape ok (${secretKey.slice(0, 8)}…)`);
}

// 2. Webhook secret presence (can't verify signature here, but presence is mandatory)
if (!webhookSecret) {
  fail('STRIPE_WEBHOOK_SECRET is unset — webhook handler will reject everything');
} else if (!webhookSecret.startsWith('whsec_')) {
  fail(`STRIPE_WEBHOOK_SECRET doesn't start with whsec_ (got ${webhookSecret.slice(0, 8)}…)`);
} else {
  pass(`STRIPE_WEBHOOK_SECRET shape ok (${webhookSecret.slice(0, 10)}…)`);
}

// 3. Price IDs present
if (!proPriceId) fail('STRIPE_PRO_PRICE_ID is unset');
if (!teamPriceId) fail('STRIPE_TEAM_PRICE_ID is unset');
if (proPriceId && !proPriceId.startsWith('price_')) {
  fail(`STRIPE_PRO_PRICE_ID doesn't look like a price (got ${proPriceId.slice(0, 8)}…)`);
}
if (teamPriceId && !teamPriceId.startsWith('price_')) {
  fail(`STRIPE_TEAM_PRICE_ID doesn't look like a price (got ${teamPriceId.slice(0, 8)}…)`);
}

if (failures > 0 || !secretKey) {
  console.log('');
  console.error(`${RED}${failures} check${failures === 1 ? '' : 's'} failed.${RESET} Fix and re-run.`);
  process.exit(1);
}

// 4. Live API check — secret key reaches Stripe + price IDs resolve
const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });

console.log('');
console.log('Hitting Stripe API…');

try {
  const account = await stripe.accounts.retrieve();
  pass(`Authenticated as ${account.business_profile?.name ?? account.id}`);
  if (account.charges_enabled) {
    pass('Account has charges_enabled');
  } else {
    warn('Account does NOT have charges_enabled — Stripe will reject live checkouts');
  }
} catch (err) {
  fail(`Stripe API call failed: ${err.message}`);
  process.exit(1);
}

async function checkPrice(label, id) {
  if (!id) return;
  try {
    const price = await stripe.prices.retrieve(id);
    if (!price.active) {
      fail(`${label} (${id}) exists but is INACTIVE`);
      return;
    }
    const amount = price.unit_amount != null
      ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
      : 'metered';
    const interval = price.recurring?.interval ?? 'one-time';
    pass(`${label}: ${amount} / ${interval}`);
  } catch (err) {
    fail(`${label} (${id}) doesn't resolve: ${err.message}`);
  }
}

await checkPrice('STRIPE_PRO_PRICE_ID', proPriceId);
await checkPrice('STRIPE_TEAM_PRICE_ID', teamPriceId);

// 5. Webhook endpoint registered? (best-effort — we don't know the URL,
//    but we can list endpoints and warn if there are zero.)
try {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
  if (endpoints.data.length === 0) {
    warn('No webhook endpoints registered in Stripe — subscriptions won\'t sync to your DB');
    note('Add one at https://dashboard.stripe.com/webhooks pointing at /api/billing/webhook');
  } else {
    pass(`${endpoints.data.length} webhook endpoint${endpoints.data.length === 1 ? '' : 's'} registered`);
    for (const e of endpoints.data) {
      const status = e.status === 'enabled' ? `${GREEN}enabled${RESET}` : `${YELLOW}${e.status}${RESET}`;
      note(`${status}  ${e.url}`);
    }
  }
} catch (err) {
  warn(`Could not list webhook endpoints: ${err.message}`);
}

console.log('');
if (failures > 0) {
  console.error(`${RED}${failures} check${failures === 1 ? '' : 's'} failed.${RESET}`);
  process.exit(1);
}
console.log(`${GREEN}All checks passed.${RESET} Stripe is wired for tier '${tier}'.`);
