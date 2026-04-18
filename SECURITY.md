# GRID Security Model

Snapshot of what the platform defends, what it doesn't, and where to
report things. Last reviewed 2026-04-18.

## Reporting a vulnerability

Email **security@grid.systems** (or DM Nicole directly if you have
that channel). Please do NOT open a public GitHub issue. We respond
within 48 hours and publish fixes within 14 days for anything CVSS ≥
7.

## Threat model

GRID is a multi-tenant SaaS. Primary adversaries we design against:

1. **Authenticated user** attempting to read or modify another
   tenant's data (IDOR, cross-tenant queries).
2. **Public attacker** attempting to enumerate accounts, harvest
   emails, or SSRF internal infrastructure via user-controlled URLs.
3. **Compromised DB backup / read-replica** — attacker reads the
   entire DB but does not have process-level access.
4. **Misconfigured deploy** that accidentally ships a live billing
   key, real LLM credentials, or production secrets outside prod.

Explicitly out of scope (v1):
- Full RCE in the application process. If an attacker runs code in
  the Next server, they have the master encryption key. Moving to
  KMS (AWS KMS / Vault Transit) is a v2 upgrade.
- Nation-state-level adversaries, supply-chain attacks against
  transitive dependencies.

## Key security controls

### Tenant isolation

- Every tenant-scoped Prisma query composes through the helpers in
  [lib/auth/ownership.ts](lib/auth/ownership.ts). 12 guards cover
  Environment, System, Workflow, Goal, Signal, Execution,
  Intelligence, ApiKey, Webhook, Budget, Expense, Invoice.
- Guards return 404 (not 403) on any miss — existence leakage is an
  information leak we refuse to accept.
- `ownedBy()` and `accessibleBy()` helpers produce `where` fragments
  used by list endpoints so scoping never gets forgotten.
- Verified by 48 unit tests in
  [__tests__/ownership.test.ts](__tests__/ownership.test.ts).

### Authentication

- Session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in prod,
  30-day rolling expiry.
- Password: bcrypt with cost factor 12, minimum 12 characters.
- OAuth: state cookie (24 random bytes, `HttpOnly`, `SameSite=Lax`,
  10-minute TTL). Callback verifies the state cookie matches the
  query parameter before exchanging the code. No `next=` redirect
  parameter is accepted from the URL → no open-redirect surface.

### BYOK Anthropic key (per-workspace)

This is the most-asked-about control — users rightfully want to know
their key isn't logged or shared.

| Property | Implementation | Evidence |
|---|---|---|
| Key is **per-workspace**, not per-user or global | `Environment.anthropicKeyEnc` column, one per env | [prisma/schema.prisma](prisma/schema.prisma) — Environment model |
| **AES-256-GCM** at rest | 12-byte random nonce + 16-byte auth tag, stored as `nonce.ciphertext.tag` base64 triples | [lib/crypto/key-encryption.ts](lib/crypto/key-encryption.ts) |
| Master key from `GRID_ENCRYPTION_KEY` env var, 32 bytes | App **fails to boot** if the key is missing or wrong length | [lib/crypto/key-encryption.ts:48](lib/crypto/key-encryption.ts:48) |
| Plaintext **never** touches DB, logs, or error responses | Only the encrypted ciphertext and a `sk-ant-...XXXX` preview are stored | audited Nov 2026 |
| Key validated against Anthropic before storage | 1-token Haiku ping on the user's own account (near-zero cost) confirms the key is live and has quota | [app/api/settings/anthropic-key/route.ts:108](app/api/settings/anthropic-key/route.ts:108) |
| Only workspace owners + ADMIN members can connect/rotate/disconnect | `getAdministrableEnvironment()` rejects VIEWER and CONTRIBUTOR roles | [app/api/settings/anthropic-key/route.ts:27](app/api/settings/anthropic-key/route.ts:27) |
| Workflow executions also use the BYOK key | [lib/kernel/runtime.ts](lib/kernel/runtime.ts) resolves the tenant client per-invocation via `getAnthropicClientForEnvironment` | fix landed 2026-04-18 |
| Tamper detection | GCM auth tag catches any flip of ciphertext, nonce, or tag — decrypt throws | 11 tests in [__tests__/key-encryption.test.ts](__tests__/key-encryption.test.ts) |

### SSRF

All outbound `fetch()` paths that consume a user-supplied URL pass
through [lib/security/ssrf.ts](lib/security/ssrf.ts). The guard
blocks:

- Non-http(s) schemes (file:, gopher:, javascript:, data:, …)
- URL user-info (`user:pass@host`) — foreign to every integration we
  use and commonly used to smuggle past naive parsers
- Loopback (127.0.0.0/8, ::1)
- RFC1918 private ranges (10/8, 172.16/12, 192.168/16)
- Link-local + cloud metadata (169.254.0.0/16 → AWS/GCP/Azure
  metadata services)
- IPv6 ULA (fc00::/7), link-local (fe80::/10), multicast (ff00::/8)
- IPv4-mapped IPv6 (both dotted and hex-compressed forms)
- A hardcoded hostname blocklist (localhost,
  metadata.google.internal, kubernetes.default.svc, …)

The DNS-aware `resolveAndValidate()` variant catches attacker
domains that resolve to private IPs — it runs immediately before
dispatch in:

- [app/api/webhooks/[id]/route.ts](app/api/webhooks/[id]/route.ts) — webhook test-fire
- [lib/webhooks.ts](lib/webhooks.ts) — webhook delivery
- [lib/integrations/clients/fetch-safe.ts](lib/integrations/clients/fetch-safe.ts) — every integration client

All fetch calls also set `redirect: 'manual'` so a 302 to a private
IP can't slip past. Covered by 44 tests in
[__tests__/ssrf.test.ts](__tests__/ssrf.test.ts).

### Billing safety during beta

External testers should never see a real charge. Enforced in two
places:

1. **Key shape gate** — `validateStripeKeyForTier` in
   [lib/billing/guardrails.ts](lib/billing/guardrails.ts) refuses
   `sk_live_*` keys outside the `live` tier and requires
   `sk_test_*` during beta. If a prod key accidentally lands in a
   preview env, the checkout returns 400 rather than charging.
2. **Always-trial** — `computeBetaTrialDays` returns a trial period
   (default 30 days, configurable via `STRIPE_BETA_TRIAL_DAYS`) for
   every non-live tier. `payment_method_collection: 'always'` plus
   `trial_settings.missing_payment_method: 'pause'` means the
   checkout captures a card but does not charge.

Covered by 17 tests in
[__tests__/billing-guardrails.test.ts](__tests__/billing-guardrails.test.ts).

### HTTP security headers

Set by [middleware.ts](middleware.ts) on every response:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera/mic/geolocation/interest-cohort all disabled
- `Content-Security-Policy`: `default-src 'self'`, `connect-src 'self' https://api.anthropic.com`, `frame-ancestors 'none'`. Production script-src drops `unsafe-eval`. Tested in [__tests__/security-headers.test.ts](__tests__/security-headers.test.ts).

### Rate limiting

- General authenticated API: 120 req/min per identity
- Nova chat: 30 req/min per identity
- Agent runs: 20 runs/min per identity (bounds Anthropic spend)
- Sign-in by IP: 5 fails / 15 min (distributed via Upstash when
  configured, in-process fallback otherwise)
- Sign-in by email: 5 fails / 15 min
- Waitlist by IP: 5 / 15 min
- Waitlist by email: 3 / hour

See [lib/rate-limit.ts](lib/rate-limit.ts). Buckets are per-key, so
one tenant's traffic can't starve another.

## Compliance posture

| Area | Status | Notes |
|---|---|---|
| GDPR — encryption at rest | ✓ | BYOK keys + Email column are AES-256-GCM encrypted; pseudonymised via `emailHash` |
| GDPR — right to erasure | Partial | Account delete cascades (FK-based); bulk export + scheduled purge on the roadmap |
| GDPR — subprocessors | Documented | Anthropic, Vercel, Turso, Resend, OAuth providers. Consent surfaced at sign-up |
| CCPA | Covered by GDPR controls | No Californian-specific handling needed yet |
| SOC 2 | Not yet pursued | Plan to kick off Type II audit post-launch once controls are in place 6 months |

## CI security gates

Every PR runs:

- `gitleaks` — secret scan across full history
- `osv-scanner` — vulnerability check against `package-lock.json`
- `npm audit --production --audit-level=high` — fails PR on new
  high/critical in production deps
- Unit test suite including SSRF, ownership, crypto, billing,
  headers → 255+ tests

Weekly cron re-runs the same matrix so newly-disclosed CVEs in
untouched branches are surfaced.

## Known limitations (roadmap)

- Per-tenant audit log export — UI exists, bulk download pending
- WebAuthn / passkey sign-in — designed, not yet shipped
- Customer-managed encryption keys (CMEK) — v2, blocked on KMS
  integration
- SSO (SAML/OIDC for enterprise) — live tier only, not yet live
