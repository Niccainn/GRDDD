---
name: stripe-mode-flip
description: Use this skill when changing Stripe between test mode and live mode, or when bringing GRID's billing online for the first time. Coordinates the 5 env vars + 2 product creations + 1 webhook registration + 1 deploy + verification — all of which must move together or checkout silently breaks.
---

# Skill: stripe-mode-flip

## When to invoke

- "Flip Stripe to live mode"
- "Switch to test mode"
- "Stripe checkout returns 503" (likely tier mismatch with key mode)
- First-time Stripe setup
- Rotating any `STRIPE_*` env var

## The 5 envs that move together

| Env var | What it is | Test mode shape | Live mode shape |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | API auth | `sk_test_…` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_…` (per-endpoint, separate test+live) | `whsec_…` (separate from test) |
| `STRIPE_PRO_PRICE_ID` | Internal `PRO` plan price (display label "Team", $29/seat/mo) | `price_…` (test product) | `price_…` (live product) |
| `STRIPE_TEAM_PRICE_ID` | Internal `TEAM` plan (display "Enterprise" — but Enterprise routes to `MARKETING_CTA`, not Stripe checkout, so this is mostly unused) | `price_…` | `price_…` |
| `GRID_BETA_TIER` | Tier gate | `byok` (allows test keys, rejects sk_live_*) | `live` (allows sk_live_*) |

PLUS: register a webhook endpoint in Stripe dashboard for the matching mode.

## Procedure

### Phase 1 — Prepare in Stripe dashboard (manual; user-driven)

The user needs to do these in `https://dashboard.stripe.com/acct_1TMcdwDnDLacRz1M`:

1. **Toggle to target mode** (top-right) — orange "Test data" badge for test, no badge for live
2. **Create products** if missing:
   - Team: $29/seat/month recurring → copy `price_…` ID
   - Enterprise: $79/seat/month recurring → copy `price_…` ID (rarely used; can defer)
3. **Register webhook**:
   - URL: `https://grddd.com/api/billing/webhook`
   - Events (all 4 are required — see `app/api/billing/webhook/route.ts`):
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Save → reveal "Signing secret" → copy `whsec_…`
4. **Get the secret key**: Developers → API Keys → "Reveal X key" → copy `sk_test_…` or `sk_live_…`

### Phase 2 — Set the envs (this skill)

For each value, use the `vercel-env-bulk` skill (clipboard → file → stdin pipe).

```bash
# Order matters — set the keys + price IDs first, the tier last
# (so a mid-flow state doesn't have a live key under byok tier)

# 1. STRIPE_SECRET_KEY
# 2. STRIPE_WEBHOOK_SECRET  
# 3. STRIPE_PRO_PRICE_ID
# 4. STRIPE_TEAM_PRICE_ID
# 5. GRID_BETA_TIER (last — it gates everything else)

# After all 5 set:
vercel deploy --prod --force --yes
```

### Phase 3 — Verify

```bash
cd /Users/nc/projects/grid
vercel env pull /tmp/_pe --environment=production --yes
(set -a; . /tmp/_pe; set +a; node /Users/nc/projects/grid/.claude/worktrees/trusting-torvalds-11563a/scripts/verify-stripe-config.mjs)
rm -f /tmp/_pe
```

Expected output: all-green per `check:stripe`. If anything red, fix only that thing — don't reset the whole flow.

### Phase 4 — Smoke test

```bash
# As a real user (or test user):
# 1. Sign up (if not already)
# 2. Visit /settings/billing
# 3. Click "Upgrade to Team"
# 4. Use Stripe test card 4242 4242 4242 4242, any future expiry, any CVC, any ZIP
# 5. Complete checkout
# 6. Land back on /settings/billing → confirm plan badge says "Team"
# 7. Check Stripe Dashboard → Webhooks → endpoint events → recent deliveries → 200 OK
```

If steps 1-7 pass, mode flip is complete.

## Failure modes

- **`No such price`** — price IDs from one mode don't exist in the other. Fix by recreating products in target mode.
- **Webhook 400s** — signing secret mismatch. The `whsec_…` is per-endpoint AND per-mode. After registering a new endpoint, copy the NEW signing secret.
- **`sk_live_` rejected** — `GRID_BETA_TIER=byok` (or `closed`) refuses live keys. Set tier to `live` first, then set `sk_live_…`.
- **Checkout returns 503** — usually `STRIPE_SECRET_KEY` empty or wrong-mode for current tier. Run `check:stripe` to localise.
- **Build cache hides env changes** — always use `--force` on the post-set deploy.
- **Phantom webhook secret** — env is set, but no endpoint registered in Stripe → secret points nowhere. `check:stripe` warns "No webhook endpoints registered".
- **Multiple webhooks** — if you register a second endpoint while debugging, ensure the env points at the active one's secret.

## Owner

`operator + finance` (joint — operator handles env wiring; finance owns product/price/webhook config in the Stripe dashboard)
