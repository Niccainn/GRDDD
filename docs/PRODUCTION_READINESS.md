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

## Monitoring what matters

With zero paid tooling, these are the four signals that must be
watched daily:

1. `/api/health` returning 200 — UptimeRobot alerts you
2. Recent-errors count on `/api/health` — also UptimeRobot (watches response body for `recent_errors.status = error`)
3. Vercel deployment status — dashboard has a built-in alert email
4. Stripe dashboard for any charge attempt that shouldn't exist — check weekly

If any of these four misses alerting, that's the next operational gap
to close before anything else on the roadmap.
