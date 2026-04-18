# Production Readiness Runbook

One page. What's done, what's gated on external action, what still
needs to happen before the first non-author user signs in. Updated
whenever anything shifts.

## Done (shipped, tested, green)

- [x] **BYOK Anthropic key** per workspace, AES-256-GCM at rest, tamper-detecting
- [x] **Workflow BYOK consistency** — kernel runtime resolves tenant client per invocation (not a singleton)
- [x] **SSRF hardened** on webhook delivery, integration fetch, webhook test-fire
- [x] **Tenant isolation** — `assertOwns*` guards on 12 models + 48 unit tests
- [x] **CrossDomainInsight tenant scope** — nullable-env-id migration + route guards
- [x] **Stripe billing safety** — `sk_live_*` refused outside live tier, always-trial during beta
- [x] **Rate limiting** on sign-in, sign-up, waitlist, API, Nova, agent runs
- [x] **Integration sync dispatcher** with real fetchers for Notion, Slack, Google Calendar, HubSpot
- [x] **Scheduled sync cron** (every 15 min via Vercel Cron)
- [x] **Self-hosted error log** (AppError table — zero SaaS cost)
- [x] **Value metering widget** — 7-day hours-saved proof
- [x] **Hardened health endpoint** — DB, env vars, sync coverage, recent-errors count
- [x] **GDPR right-to-erasure** at `POST /api/account/delete`
- [x] **Security headers** (HSTS, CSP, frame-ancestors, Permissions-Policy)
- [x] **CSP unsafe-eval** dropped in production
- [x] **Cellular scaffold MVP** — one prompt → full environment
- [x] **Per-system agent pool** — `SystemAgent` with persona + tool allowlist + autonomy tier
- [x] **Feedback loop** — scaffold corrections → `MasteryInsight` → next draft
- [x] **Nova self-iteration** — optional critic pass in scaffold generator
- [x] **Parent/child environments** — multi-brand brand-DNA inheritance
- [x] **Wavefront executor** — workflow stages run in parallel when DAG allows
- [x] **Migrations 0002–0004** present and auto-applied via `buildCommand`

## Gated on you (external action, not code)

These are NOT purchases. They're one-time human actions that can't be
automated from inside the repo.

### Before first external tester

- [ ] Set `GRID_CRON_TOKEN` in Vercel prod + staging env vars (value: `openssl rand -base64 32`)
- [ ] Verify `GRID_ENCRYPTION_KEY` exists in prod env — rotating it orphans every BYOK key, so generate once and never rotate without a re-encrypt plan
- [ ] Configure Resend domain DNS for verified sender (else password-reset emails silently drop)
- [ ] Point UptimeRobot free tier at `https://grddd.com/api/health` (free forever, no purchase)
- [ ] Add OAuth CLIENT_ID + CLIENT_SECRET for each provider you want enabled (missing env vars just hide the button — opt-in per provider)

### Before public beta

- [ ] Run staging for at least a week with your own data, catch any AppError rows before wider sign-up
- [ ] One design partner who isn't you commits a cell end-to-end
- [ ] Rehearse a Vercel deploy rollback once (promotion of a previous deploy)
- [ ] Rehearse a DB backup restore once (restore to a fresh Postgres and run smoke checklist)

### Before charging real money (flip to `live` tier)

- [ ] `GRID_BETA_TIER=live` set in prod env only
- [ ] Stripe key swapped from `sk_test_*` to `sk_live_*` in prod only (guardrail in `lib/billing/guardrails.ts` refuses live keys in non-live tiers)
- [ ] Privacy policy updated to name all subprocessors (Anthropic, Vercel, Turso/DB provider, Resend, any connected OAuth providers)
- [ ] Terms of service reviewed — ideally by a lawyer, minimum by Common Paper's free SaaS Agreement template
- [ ] Explicit confirmation-email UX on account delete (currently immediate; for live tier add 48-hour reversal window)

## Intentionally deferred (documented, not urgent)

- SOC 2 Type II — 6-month observation window, only worth starting after $X ARR milestone
- Cross-tenant pattern library activation — schema in place (`ShapeAbstraction`), gated until privacy review complete
- Fine-grained audit log UI — rows exist, UI deferred
- WebAuthn / passkey sign-in — designed, not shipped
- Full Nova prompt-injection live runner — harness scaffolded in `__tests__/nova-eval`, live mode gated on `NOVA_EVAL_URL`

## Compliance matrix

Status against the regulations that actually apply to a pre-revenue
SaaS operating in NA/EU. "✅" = shipped in code. "⚠️" = shipped but
needs human action (domain verification, policy text, etc.). "❌" =
not yet addressed.

### GDPR (EU General Data Protection Regulation)

| Article | Requirement | Status | Evidence |
|---|---|---|---|
| 5(1)(f) | Integrity & confidentiality — encryption at rest | ✅ | [lib/crypto/key-encryption.ts](../lib/crypto/key-encryption.ts) AES-256-GCM. Anthropic keys + email (via emailHash) both encrypted. |
| 5(1)(e) | Storage limitation | ✅ | [app/api/cron/errors-cleanup/route.ts](../app/api/cron/errors-cleanup/route.ts) — 30-day default retention for AppError rows. |
| 15 | Right of access | ⚠️ | Partial — users see their data via the app UI. Dedicated "access request" endpoint not strictly required when portability + app-level access both exist. |
| 17 | Right to erasure | ✅ | [app/api/account/delete/route.ts](../app/api/account/delete/route.ts) — cascades through every tenant-scoped table, clears AppError rows, invalidates session cookie. |
| 20 | Right to data portability | ✅ | [app/api/account/export/route.ts](../app/api/account/export/route.ts) — returns all tenant data as versioned JSON. |
| 25 | Data protection by design | ✅ | Ownership guards on every `/api/*/[id]` route. [lib/auth/ownership.ts](../lib/auth/ownership.ts) + 48 unit tests. 404 instead of 403 to avoid existence leaks. |
| 30 | Records of processing | ⚠️ | Implicit via DB schema + AppError + audit log. Not formalised as a public document. |
| 32 | Security of processing | ✅ | CSP, HSTS, rate limiting, SSRF guards, encryption at rest — see [SECURITY.md](../SECURITY.md). |
| 33 | Breach notification (72h) | ❌ | Human process, not a code change. Document runbook + contact list before first EU user. |
| 7 / ePrivacy | Consent at collection | ⚠️ | Policy linked at sign-up; no explicit consent checkbox nor separate consent log. Add a `ConsentLog` table + checkbox before EU user intake. |

### CCPA (California)

Covered by the GDPR primitives — right-to-know is the export endpoint,
right-to-delete is the delete endpoint. CCPA does not require explicit
consent at collection, so we inherit compliance from the GDPR work.

### PCI DSS (payment card data)

**Out of scope by architecture.** All card data is tokenised by Stripe
— Grid's servers never see a PAN, CVV, or expiry. We only store
`stripeCustomerId` references. PCI DSS SAQ-A eligible.

### HIPAA (US health information)

**Not applicable.** Grid does not collect PHI. Terms will prohibit
uploading PHI; no BAA available. Future HIPAA coverage = separate
paid tier.

### SOX / SOC 2

Not applicable until public reporting obligations (SOX) or enterprise
customers demanding SOC 2 Type II. When SOC 2 pursuit starts, existing
security posture is ~70% of what Type I requires.

### EU AI Act

Grid is a "general-purpose AI system" deployer, not a provider.

| Obligation | Status |
|---|---|
| Users know they're interacting with AI | ✅ — Nova is explicitly branded as AI |
| Disclose AI-generated content | ⚠️ — clearly-marked in-app; no watermark on exports yet |
| Human oversight via autonomy tiers | ✅ — [components/AutonomyBadge.tsx](../components/AutonomyBadge.tsx) surfaces tier on every agent output |
| Log AI decision provenance | ✅ — kernel trace + Execution rows + ExecutionReview |
| No prohibited uses (social scoring, biometric categorisation) | ✅ by product shape |

## What could actually get you fined today

Triaged — things most likely to cause a real regulator action against
a 1-person pre-launch SaaS:

1. **Silent cross-tenant data leak** — mitigated. Tenant isolation guards on every `/api/*/[id]` route + 48 unit tests.
2. **Stripe live-key drift** — mitigated. `lib/billing/guardrails.ts` refuses live keys outside `live` tier.
3. **No data export/delete when an EU user asks** — mitigated. Endpoints shipped today.
4. **Silent email failure hiding a password-reset outage** — mitigated. Email failures now log to AppError, visible via `/api/health`.
5. **Missing consent log** — **open gap**. EU law requires provable consent at collection. Close before wider EU intake.
6. **Missing public subprocessors list** — **paperwork gap**. Enumerate Anthropic / Vercel / Turso-or-Neon / Resend / Stripe / OAuth providers on a `/subprocessors` page.
7. **No cookie-consent banner** — safe today (only `grid_session` which is essential and exempt). Becomes a gap the moment non-essential cookies (analytics, tracking) are added.
8. **Breach notification runbook** — **paperwork gap**. One-page process doc + contact list.

## Monitoring what matters

With zero paid tooling, these are the four signals that must be
watched daily:

1. `/api/health` returning 200 — UptimeRobot alerts you
2. Recent-errors count on `/api/health` — also UptimeRobot (watches response body for `recent_errors.status = error`)
3. Vercel deployment status — dashboard has a built-in alert email
4. Stripe dashboard for any charge attempt that shouldn't exist — check weekly

If any of these four misses alerting, that's the next operational gap
to close before anything else on the roadmap.
