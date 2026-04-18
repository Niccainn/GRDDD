# GRID Beta Testing Guide

For external testers running GRID in a non-production environment.

## Pre-flight checklist (deployer)

Before inviting anyone else, the deployer must verify:

- [ ] `GRID_BETA_TIER` is `closed` or `byok` (NOT `live`)
- [ ] `GRID_ENCRYPTION_KEY` is set to a 32-byte base64 value (generate
      with `openssl rand -base64 32`). App fails to boot if missing.
- [ ] `DATABASE_URL` points at a non-production Postgres.
- [ ] `STRIPE_SECRET_KEY`, if set at all, starts with `sk_test_`.
      Live keys are refused by the checkout route outside `live` tier.
- [ ] `NEXT_PUBLIC_APP_URL` is the exact public URL of this deploy
      (OAuth callbacks use it).
- [ ] OAuth CLIENT_ID / CLIENT_SECRET pairs are set only for providers
      you actually want available. Missing env vars = button hidden.
- [ ] `ANTHROPIC_API_KEY` on the server is your own key, not a
      customer's. In `byok` tier it's not used unless a tenant lacks
      its own key (it won't be — that tier refuses).

## What testers will not be charged for

During beta (`closed` or `byok` tier):

- **No Stripe charges.** Checkout captures a card (if enabled at all)
  with a 30-day trial and `payment_method_collection: 'always'`.
  Pause-on-missing-payment means a forgotten card never starts
  charging.
- **No Anthropic charges from GRID.** In `byok` tier Nova refuses to
  run until the workspace owner connects their own Anthropic key.
  The bill goes direct to the tester's Anthropic account.
- **No other paid third-party charges.** All integrations are OAuth
  or BYO-key — the tester's own accounts get used.

## What testers should know

### Your Anthropic key is per-workspace

- You connect it at `/settings/ai`. The key is AES-256-GCM encrypted
  at rest, never logged, never sent in error responses.
- Only you (the workspace owner) and any ADMIN members can connect,
  rotate, or disconnect it. VIEWERs and CONTRIBUTORs cannot change
  billing.
- You can paste a fresh key any time — the old ciphertext is
  overwritten in one transaction.
- Disconnecting wipes all three key columns
  (`anthropicKeyEnc`, `anthropicKeyPreview`, `anthropicKeyAddedAt`).

### Data isolation

- Every workspace (Environment) is tenant-isolated. You cannot see
  another tester's systems, workflows, executions, signals, or
  documents even if you try to hit their ID directly — the API
  returns 404, never 403.
- Signals, webhook payloads, and Nova conversation logs stay inside
  your workspace.

### What gets shared across tenants

These are the only cross-tenant surfaces (documented for honesty):

- Rate-limit buckets — keyed per identity, so your traffic can't
  starve another tenant's but the in-process bucket store is shared.
- Demo cross-domain insights (seeded rows with `environmentId = null`)
  are read-only visible to all authenticated testers. These are
  synthetic illustrative data, not real data from any tenant.
- Aggregate metrics on the operator's health page (counts only, no
  row-level data).

### Known sharp edges

- **In-process rate limiter**: preview deploys without Upstash
  configured lose state on cold start. A determined attacker could
  evade sign-in lockout by triggering cold starts. Prod uses Upstash.
- **Email deliverability**: outbound email uses Resend. If
  `RESEND_API_KEY` is unset, email is silently dropped (password
  resets won't arrive). Set a real key before onboarding testers.
- **OAuth providers**: each provider needs its CLIENT_ID and
  CLIENT_SECRET. Missing → button hidden on `/sign-in`. The
  authorize redirect uses the EXACT origin of the current request, so
  preview URLs need their own OAuth app or an allowlisted callback.

## How to report a security issue

See [SECURITY.md](../SECURITY.md).

Short version: **security@grid.systems**. Do not open a public
GitHub issue.

## How to report a bug

1. Open a GitHub issue with the repro steps, expected vs actual, and
   your workspace ID (visible at `/settings`).
2. Include the browser console error if any, and the request ID from
   the response headers.
3. If the bug is only reproducible with PII in the repro, email it
   instead of pasting into GitHub.

## Acceptance criteria for promotion to `live` tier

Before we flip `GRID_BETA_TIER=live`, these must be true:

- [ ] Every route in this file has been exercised end-to-end by at
      least two testers from different workspaces
- [ ] Zero outstanding P0 or P1 security issues in `docs/TESTS.md`
- [ ] Monthly backup-restore drill run + succeeded
- [ ] Anthropic eval suite passes (zero adversarial prompts succeed)
- [ ] Rate limiter in distributed (Upstash) mode
- [ ] Resend verified domain + SPF/DKIM pass
- [ ] SOC 2 Type I audit kickoff scheduled
