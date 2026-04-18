# GRID Test Strategy

Single source of truth for what's tested, what's scaffolded, and what still
needs work. Update this file whenever you add or remove test coverage.

## Current state (as of 2026-04-18)

```
Unit tests:       13 files · 185 tests passing
Integration:       1 file (scaffolded, skips without DATABASE_URL_TEST)
E2E (Playwright):  1 file (scaffolded, needs deps install)
Nova eval:         1 file (shape checks only, live mode gated)
Security/CI:       5 workflows
```

Run it all locally:

```sh
npm test                # unit (always)
npm run test:coverage   # unit + coverage report
npm run test:integration  # requires local Postgres (see below)
npm run test:e2e        # requires Playwright install (see below)
```

---

## Sprint 1 — Unit tests ✅

All logic with no infra dependency. Runs on every PR via `npm test`.

| File | What it covers |
|------|----------------|
| `__tests__/key-encryption.test.ts` | AES-256-GCM roundtrip, tamper rejection, key-preview safety |
| `__tests__/ownership.test.ts` | Every `assertOwns*` guard: returns row / throws 404 / filters soft-delete |
| `__tests__/config.test.ts` | `getBetaTier` default + tier transitions, cap parsing |
| `__tests__/normalize.test.ts` | Status + priority maps across Notion/Asana/Monday/CSV |
| `__tests__/csv-parser.test.ts` | Quoted fields, escaped quotes, row-count mismatch, date parse |
| `__tests__/analytics.test.ts` | Fire-and-forget contract, payload shape |
| `__tests__/slugify.test.ts` | URL-safe output, length cap, fallback |
| `__tests__/time.test.ts` | `relativeTime`, `formatDuration`, `parseDuration`, `minutesToDecimal` |
| `__tests__/security-headers.test.ts` | HSTS, CSP, frame-ancestors, unsafe-eval prod gate |
| `__tests__/rate-limit.test.ts` (existing) | Rate limiter bucket behaviour |
| `__tests__/block-parsing.test.ts` (existing) | Doc block parse |
| `__tests__/schedule.test.ts` (existing) | Cron-like scheduling |
| `__tests__/task-status.test.ts` (existing) | Task const invariants |

---

## Sprint 2 — Integration / DB tests 🟡 scaffolded

`__tests__/helpers/db.ts` — truncate + seed helpers.
`__tests__/integration/idor.test.ts` — IDOR sweep template.

**To run locally**:

```sh
docker run -d --name grid-test-db -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:16
export DATABASE_URL_TEST=postgresql://postgres:pw@localhost:55432/postgres
npx prisma migrate deploy
npm run test:integration
```

**TODO — extend the IDOR sweep**:

- [ ] Parametrize the cross-tenant rejection across every `assertOwns*` guard (12 of them)
- [ ] Cover every `/api/*/[id]` route with a request-level IDOR test (needs test Next handler harness)
- [ ] Environment-isolation audit: seed 2 envs, assert no Prisma query returns cross-env rows
- [ ] Onboarding template seeding: assert solo/team/blank match the seeder in `app/api/onboarding/complete/route.ts`
- [ ] Import fixtures: Asana/Monday/Notion/CSV round-trip through `/api/import`
- [ ] OAuth callback: mock provider responses for top 10 integrations, assert token encrypted at rest
- [ ] Webhook HMAC validation + replay prevention
- [ ] Workflow execution: stage progression, checkpoint, review, attribution

---

## Sprint 3 — E2E + accessibility + performance 🟡 scaffolded

- `playwright.config.ts` — chromium-only, dev server on port 3000.
- `e2e/landing.spec.ts` — first golden path + axe-core scan.
- `.lighthouserc.json` — perf/a11y/SEO budgets.
- `.github/workflows/lighthouse.yml` — runs on every PR.

**To run locally**:

```sh
npm install --save-dev @playwright/test @axe-core/playwright wait-on
npx playwright install --with-deps chromium
npm run test:e2e
```

**TODO — golden paths (aim for 5–8 total)**:

- [x] Landing (hero + keyboard focus + axe)
- [ ] Sign-up → /welcome → /dashboard with "Solo" template (assert seeded systems)
- [ ] Create system → create workflow → run → review execution (the core loop)
- [ ] Connect OAuth integration (stub provider; assert token encrypted at rest)
- [ ] BYOK key flow: paste → validate → Nova runs → disconnect
- [ ] Import Notion workspace with fixture file
- [ ] Review-nudge lifecycle
- [ ] Keyboard-only pass of the core loop
- [ ] Mobile viewport smoke test

**TODO — extensions**:

- [ ] Run axe-core assertion on every golden path (template exists in `landing.spec.ts`)
- [ ] Add visual-regression snapshots (Playwright `toHaveScreenshot`) for: landing, sign-up, welcome steps, dashboard empty + seeded, nova empty, tasks empty, workflow detail — in dark AND light mode
- [ ] Screen-reader landmark check on authed pages

---

## Sprint 4 — Security + AI evals 🟡 scaffolded

### CI workflows shipped

- `.github/workflows/security.yml` — gitleaks (every PR), OSV-Scanner (every PR), `npm audit --production` (every PR + weekly cron)
- `.github/workflows/bundle.yml` — per-route bundle budget (300KB hard cap)

### Nova evals

- `__tests__/nova-eval/prompts.ts` — 2 golden + 7 adversarial prompts across 5 attack categories (jailbreak, data-exfil, tool-hijack, system-prompt-leak, privilege-escalation)
- `__tests__/nova-eval/harness.test.ts` — shape checks always run; live mode gated on `NOVA_EVAL_URL` env var

**TODO**:

- [ ] Implement the live runner (POST to Nova endpoint, parse SSE stream, collect text + tool_calls, pass to grade/detect)
- [ ] Expand golden set to ≥20 prompts covering: overview, health, bottlenecks, workflow creation, signal triage, playbook query
- [ ] Expand adversarial set to ≥30 prompts; auto-grow from any "Nova said something wrong" user report
- [ ] CI schedule: weekly run against staging
- [ ] Cost stress test: adversarial "keep thinking" loop — assert cap trips before $1 burn

---

## Sprint 5+ — Depth (not yet started)

Lower priority until Sprints 1–4 are green in CI on every PR.

### Component tests (RTL + Vitest)

- [ ] `WaitlistForm`, `ImportWizard`, `CSVImporter`
- [ ] `ExecutionReviewForm`, `ExecutionCheckpoint`
- [ ] `AttributionPanel`, `MasteryWidget`
- [ ] `Sidebar` (collapse persistence, env-scoped nav)
- [ ] `CommandPalette` (keyboard nav)
- [ ] `PersistentNovaBar` (stream handling, abort)

### Contract tests

- [ ] Snapshot response shape for top 20 most-called API endpoints
- [ ] Zod schemas for request bodies (replaces ad-hoc `typeof body?.x === 'string'`)

### Data integrity

- [ ] Migration safety check on every `prisma/schema.prisma` PR (`prisma migrate diff`)
- [ ] Monthly backup-restore drill
- [ ] Soft-delete cascade tests
- [ ] Static lint rule: every Prisma query with `where` must include `environmentId` or `identityId`

### Operational

- [ ] Post-deploy smoke: `/api/health`, DB connection, Anthropic key validate, OAuth reachability
- [ ] Chaos test: kill Anthropic key mid-execution, assert graceful error + no dangling state
- [ ] Environment parity report (preview vs prod config diff)

### Load / perf

- [ ] k6 or autocannon @ 100 RPS against `/api/operate-data` and `/api/nova/global`, assert p95
- [ ] Prisma query log audit: fixture load of `/dashboard`, assert <N queries (catch N+1)
- [ ] Bundle analyzer in CI + per-PR size delta comment

---

## Known gaps this doesn't solve

- `timeAgo` / `daysLeft` are copy-pasted across 7 component files instead of imported from `lib/time.ts`. Refactor + test the shared version.
- `consequence-predictor`, `playbook-generator`, `integration-intel` are DB-heavy; they belong in the integration tier once the DB harness lands.
- No test yet for `PersistentNovaBar`'s streaming-abort contract — lives under component tests.

Close those three in Sprint 5.
