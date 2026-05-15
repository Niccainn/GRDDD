# GRID — Market State (read-only repo audit)

> An honest read of what GRID is and isn't, sourced from the repo on
> `main` at `cd5b962`. No marketing words. Quantified where the repo
> permits. Anything not in the repo is flagged TBD.

---

## 1. One-line description

GRID is a Next.js multi-tenant web app that lets a single operator (or
small team) describe what they want done in a free-text "Project," then
streams a step-by-step plan that an Anthropic-Claude tool-use loop
executes against ~88 third-party integrations. Today it functions as a
private-beta workspace for solo founders / 3–20-person teams who already
live in Notion / Slack / Gmail / Figma and want one chat-driven control
plane on top of those tools — not as a public-traffic SaaS.

---

## 2. Tech stack reality

| Layer | Choice | Evidence |
|---|---|---|
| Framework | Next.js 16.2.4 (App Router, React 19.2.3) | `package.json:39,42` |
| ORM / DB | Prisma 6.19.3 → PostgreSQL (SQLite fallback for local dev) | `package.json:41`, `.env:15`, `prisma/schema.prisma` (2,466 lines, 76 models) |
| Auth | Hand-rolled session cookies (`grid_session`, 30-day TTL), bcrypt password hash, optional Google / Microsoft OAuth, no NextAuth | `lib/auth.ts:1-80`, `lib/auth/*.ts` |
| Payments | `stripe@22.0.1` SDK, gated by `STRIPE_SECRET_KEY`. Beta-mode short-circuit refuses live keys outside `live` tier and injects a 30-day trial so cards-on-file never charge | `package.json:46`, `app/api/billing/checkout/route.ts:1-98`, `lib/billing/guard.ts:6-8` |
| Observability | Sentry 10.51.0 (server + edge + client), wired via `instrumentation.ts` and `instrumentation-client.ts`. No-op if `SENTRY_DSN` unset | `package.json:31`, `instrumentation.ts:13-20`, `sentry.*.config.ts` |
| AI / LLM | Anthropic SDK 0.90.0; models: `claude-haiku-4-5` (fast), `claude-sonnet-4-5` (balanced), `claude-opus-4-6` (deep). Model picked by token-cost router based on tool count + prompt hint | `package.json:28`, `lib/kernel/router.ts:25-47` |
| Hosting | Vercel (`vercel.json` present; `VERCEL_ENV` checks throughout; cron via Vercel cron) | `vercel.json`, `lib/feature-flags.ts:32-35` |
| Test ladder | Unit/integration: 33 vitest files at `__tests__/` root + 1 in `__tests__/integration/` + 2 in `__tests__/nova-eval/` (36 total). E2E: 3 Playwright spec files (`e2e/landing.spec.ts`, `e2e/list-pages.spec.ts`, `e2e/post-auth-flow.spec.ts`). Load: 1 k6 script (`load/smoke.js`) | `package.json:16-25` |
| Lines of TS/TSX | **140,893** lines across the repo (excludes `node_modules`, `.next`) | `find . -type f \( -name '*.ts' -o -name '*.tsx' \)` |

Notable absences: no NextAuth, no tRPC, no GraphQL, no Tailwind UI kit,
no Storybook, no Datadog/Honeycomb, no Vercel KV (Upstash Redis is
optional for distributed rate limiting only).

---

## 3. Surface inventory

### 3.1 Public marketing routes (12)

| Route | Path | Notes |
|---|---|---|
| Landing | `/` | Hero + waitlist anchor (`#waitlist`) |
| Pricing | `/pricing` | Three plans, comparison table |
| Access / waitlist | `/access` | Same waitlist surface |
| Compare hub | `/compare` + `/compare/[slug]` | Comparative pages |
| Use cases hub | `/use-cases` + `/use-cases/[slug]` | 6+ slug-routed cases |
| Blog | `/blog`, `/blog/week-1`, `/blog/[slug]` | At least one hand-coded post |
| Roadmap | `/roadmap` | Public roadmap |
| Capabilities | `/capabilities` | Capability catalog |
| Changelog | `/changelog` | Self-published log |
| Help / docs | `/help`, `/help/[slug]`, `/docs`, `/docs/[id]` | Mixed public/auth |
| Legal | `/privacy`, `/terms`, `/legal/dpa`, `/subprocessors`, `/security`, `/security/architecture`, `/security/controls` | Standard legal surface area |
| Research | `/research` | "Public front door for serious people" (commit `86a241b`) |

Auth routes also public: `/sign-in`, `/sign-up`, `/forgot-password`,
`/reset-password`, plus token-bearing `/portal/[token]` (client portal),
`/invite/[token]` (member invite), `/f/[slug]` (public form),
`/share/environment/...` (read-only env share).

### 3.2 Authenticated app routes

`find app -name page.tsx` returns **111 page files** in total. After
removing the marketing/legal set above, the authenticated app surface
groups roughly as:

| Domain | Routes |
|---|---|
| Workspace shell | `/dashboard`, `/dashboards`, `/dashboards/[id]`, `/environments`, `/environments/[slug]`, `/environments/trash`, `/welcome`, `/onboarding` |
| Operations | `/inbox`, `/calendar`, `/tasks`, `/tasks/board`, `/tasks/[id]`, `/projects`, `/projects/[id]`, `/meetings`, `/meetings/[id]`, `/approvals`, `/signals` (via inbox) |
| Atrium / agents | `/nova`, `/agents`, `/agents/new`, `/agents/[id]`, `/memory`, `/traces`, `/executions`, `/executions/[id]` |
| Building blocks | `/systems`, `/systems/[id]`, `/workflows`, `/workflows/[id]`, `/workflows/[id]/edit`, `/automations`, `/automations/[id]`, `/templates`, `/marketplace`, `/marketplace/[slug]` |
| Knowledge / content | `/docs`, `/docs/[id]`, `/forms`, `/forms/[id]`, `/assets`, `/assets/[id]`, `/canvases` (via API) |
| Data + insight | `/analytics`, `/analytics/history`, `/reports`, `/research`, `/goals`, `/goals/[id]`, `/mastery`, `/skill-space` |
| Finance | `/finance`, `/finance/invoices`, `/time` |
| Learning | `/learn`, `/learn/courses`, `/learn/author` |
| Audit / admin | `/audit`, `/activity`, `/settings`, plus settings sub-pages: `/settings/billing`, `/settings/team`, `/settings/api-keys`, `/settings/keys`, `/settings/webhooks`, `/settings/preferences`, `/settings/consent`, `/settings/ai`, `/settings/invites` |
| Integrations | `/integrations` (provider grid) |

Coverage is broad but uneven — see §7 for which surfaces are fully wired
vs. scaffold.

### 3.3 API routes — 230 `route.ts` files, grouped

| Domain | Files | What they do |
|---|---|---|
| `/api/auth/**` | 17 | sign-in/up/out, OAuth start+callback (Google + generic provider router), invite accept/info, verify-email, forgot/reset password, providers list, session `me` |
| `/api/integrations/**` | 9 | List, connect, repair, sync, test, OAuth start+callback, providers metadata, health |
| `/api/billing/**` | 4 | Checkout session, customer portal, list, Stripe webhook |
| `/api/agents/**` | 11 | CRUD, run, run/stream (SSE), runs/[runId]/actions/blocks, templates CRUD + shape, orchestrate |
| `/api/nova/**` | 9 | execute, global, action/[id]/teach, logs, memory CRUD, reflections, root |
| `/api/workflows/**` | 12 | CRUD, run, attribution, duplicate, save-template, versions, from-prompt, marketplace, node-learned, webhook/[path] |
| `/api/environments/**` | 14 | CRUD + actions/undo, clone, dashboard, exceptions, impact, invite, members, narrative, restore, roi, share, team-telemetry, trash, scaffold |
| `/api/systems/**` | 7 | CRUD, agent, context CRUD, executions, nova-config |
| `/api/executions/**` | 6 | CRUD, checkpoint, decisions, review, unreviewed |
| `/api/meetings/**` | 5 | CRUD, action items + promote, process |
| `/api/tasks/**` | 5 | CRUD, comments, dependencies, bulk |
| `/api/finance/**` | 6 | budgets, expenses, invoices CRUD |
| `/api/v1/**` | 4 | Public-API surface (executions, run, systems, workflows) |
| `/api/cron/**` | 4 | tick, agents, errors-cleanup, sync-integrations (cron-token gated) |
| `/api/admin/**` | 0 in repo | Removed — `1a91975 Remove admin surfaces; keep internal off-tree` |

Ad-hoc routes worth flagging: `/api/sse` + `/api/sse/poll` (presence /
real-time fanout), `/api/health` + `/api/health/ready` (uptime probe),
`/api/waitlist` (public POST), `/api/forms/submit/[slug]` (anonymous
form ingest), `/api/portal/[token]` (client-portal read).

---

## 4. Integration reality

`lib/integrations/registry.ts` declares **110 providers**. **94 carry
`implemented: true`**, **16 carry `implemented: false`**. Cross-checking
against `lib/integrations/oauth/*.ts` (16 files incl. `base.ts` and
`generic.ts`, with a generic factory used by ~52 of the OAuth providers)
and `lib/integrations/clients/*.ts` (97 adapter files):

### 4.1 Headline counts

| Bucket | Count |
|---|---|
| Providers in registry | 110 |
| `implemented: true` in registry | 94 |
| `implemented: false` in registry (UI greys these out) | 16 |
| Concrete OAuth modules | 16 (incl. `base.ts`, `generic.ts`) — covers ~all OAuth providers via `generic.ts` factory |
| Concrete API-key modules | 3 (`cloudflare.ts`, `shopify.ts`, `stripe.ts`) — most api-key providers handled inline by their adapter |
| Concrete client/adapter modules | 97 (one per implemented provider, plus shared helpers `fetch-safe.ts`, `google-shared.ts`) |

### 4.2 Providers explicitly NOT implemented (16)

`apple_calendar`, `caldav`, `pipedrive`, `zoho_crm`, `freshsales`,
`close`, `sketch`, `tally`, `jotform`, `rippling`, `replicate`,
`zapier`, `make`, `n8n`, `sentry` (the integration, not the SDK), `aws`.

These render in the `/integrations` UI with a "coming soon" affordance
(per the field comment at `lib/integrations/registry.ts:73-74`).

### 4.3 Reality stratification

The interesting question is not "how many adapters exist" but "what can
Atrium actually do today." The Atrium tool registry
(`lib/nova/tools/registry.ts:57-333`) hand-wires only **7 first-class
tools**: `slack.listChannels`, `slack.postMessage`, `notion.searchPages`,
`notion.createPage`, `github.listOpenIssues`, `github.createIssueComment`,
`figma.getFile`, `figma.getTextContent`. Everything else flows through
two **meta-tools** (`integration_list`, `integration_call`) that
dispatch into the catalog by name (`lib/integrations/catalog.ts`). That
means: provider coverage is wide, but Atrium's *opinionated* tool
schemas are narrow — Claude has to discover other providers' methods at
runtime and the dispatcher tries multiple call conventions
(`registry.ts:302-330`).

The skill-executor layer (`lib/skills/executors/`) is a separate, more
opinionated path used by the Project primitive (the "type what you want"
flow) and currently wires **14 executors**:

- `claude.summarize`, `claude.draft_copy` (reasoning only)
- Real provider calls: `notion.create_page`, `notion.fetch_document`,
  `notion.upload_asset`, `slack.post_message`, `gmail.draft_email`,
  `google_calendar.draft_event`, `google_drive.save_file`,
  `figma.create_file`, `figma.create_logo_explorations`,
  `figma.export_asset`, `canva.create_design`,
  `meta_ads.draft_campaign` (real PAUSED write),
  `google_ads.draft_campaign` (validates + deep-links — not a real
  write yet), `linkedin_ads.draft_campaign` (same)
- `human.review` (gate)
- `simulated.adobe.create_illustrator_file` (placeholder)

Bottom-line table:

| Tier | Count | Meaning |
|---|---|---|
| Registry-declared providers | 110 | Show up in `/integrations` UI |
| `implemented: true` (have OAuth/api-key + client adapter) | 94 | Can be CONNECTED — token / key flow works |
| Reachable by Atrium via meta-tool dispatcher | 94 | Claude can call any client-method by name |
| First-class Atrium tool schemas (hand-wired) | 7 | What the LLM is *prompted* to use natively |
| Skill executors (Project flow, real writes) | 13 real + 1 simulated | What ships through the "type what you want" UI |
| Real ad-platform writes (vs. validate-only) | 1 (`meta_ads`, paused) | The other two ad executors stage but don't push |

So when the marketing copy says "110+ OAuth integrations," the literal
count is correct, but the user-experienced surface is much smaller
unless they choose to drive Atrium through the catalog meta-tool.

---

## 5. The Atrium layer (ex-"Nova")

Note on naming: the kernel and most internal code still says "Nova"
(`lib/nova/`, `lib/kernel/`, `NovaTrace`, `NovaMemory`). Commit `27a8d74`
("Rename Nova → Atrium across user-facing surfaces") flipped the
*display name* but kept the table/file names. Below uses both.

### 5.1 Where the brain lives

- **`lib/kernel/`** (router, runtime, memory, trace, redact, retention,
  budget) — provider-agnostic agent runtime, with caching-aware model
  router and per-tier budget cap.
- **`lib/nova/client-factory.ts`** — single Anthropic SDK gateway. All
  Atrium calls go through `getAnthropicClientForEnvironment(envId)`.
- **`lib/nova/tools/`** — `registry.ts`, `dispatch.ts`,
  `run-with-tools.ts` for the tool-use loop.
- **`lib/agents/`** — long-running scheduled agents that loop
  (`run-loop.ts`, `system-agent.ts`, `schedule.ts`, `templates.ts`).
- **`lib/skills/`** — taxonomy and executors for the Project primitive
  (the user-facing "type what you want done" flow).
- **`lib/intelligence/`**, **`lib/memory`** routes / `NovaMemory` model
  — long-term memory; `NovaReflection`, `MasteryInsight`,
  `ShapeAbstraction`, `CrossDomainInsight` are persisted artifacts.

### 5.2 Model providers

Anthropic only. The Anthropic SDK (`@anthropic-ai/sdk@^0.90.0`) is the
*only* LLM provider in `package.json`. There is an *integration adapter*
for OpenAI (`lib/integrations/clients/openai.ts`) so a tenant can connect
their key for tooling purposes, but Atrium itself never calls OpenAI for
its own reasoning — every kernel call routes to Claude.

Model mapping (`lib/kernel/router.ts:25-47`):

| Kernel tier | Anthropic model | $/M in / $/M out |
|---|---|---|
| `fast` | `claude-haiku-4-5` | $1 / $5 |
| `balanced` (default) | `claude-sonnet-4-5` | $3 / $15 |
| `deep` (strategy / cross-env) | `claude-opus-4-6` | $15 / $75 |

### 5.3 BYOK vs platform — by tier

`GRID_BETA_TIER` semantics (`lib/config.ts:35-65`):

| Tier | Key resolution | Public sign-up | Notes |
|---|---|---|---|
| `closed` (default) | tenant key wins; falls back to platform `ANTHROPIC_API_KEY` with 50,000-token trial cap per environment | OFF | Used for "Nicole's own dogfooding, first ~10 design partners" — the comment is in `lib/config.ts:13-15` |
| `byok` | tenant key only; throws `MissingKeyError` otherwise | ON | "Zero marginal cost per user" model |
| `live` | same as `byok` plus future trial + Stripe billing + SSO | ON | "Not yet active — see docs/PRODUCT_SYNC.md" |

Local `.env` is `GRID_BETA_TIER=byok`. Production tier value is not
visible from this repo (Vercel env). If `STRIPE_SECRET_KEY` is unset,
`isBetaMode()` returns true and *every* plan-cap and `requirePlan()`
check is bypassed (`lib/billing/guard.ts:6-8`). This means today, in any
environment without Stripe wired, GRID is effectively unlimited.

### 5.4 What "executes" means

Mostly real; partially staged. Per `lib/skills/executors/index.ts:38-66`:

- **Real, side-effectful**: Notion (create page, upload asset), Slack
  (post message), Gmail (draft email), Google Calendar (draft event),
  Google Drive (save file), Canva (create design), Figma (export asset).
- **Validates connection + stages a deep link**: Figma file/logo
  creation (Figma REST has no file-creation endpoint); Google Ads and
  LinkedIn Ads draft-campaign (multi-step writes deferred).
- **Real but PAUSED**: Meta Ads draft-campaign — does push, status
  paused (`fe085a8` commit message).
- **Simulated**: anything not in the dispatch map gets a "no executor
  registered" stub with `mode: 'simulated'`.

The `run-with-tools.ts` agent loop wraps Anthropic's tool-use protocol
and persists each step as an `AgentOutputBlock` row. There is no fake
streaming or fake "thinking…" theater — events come from the Anthropic
SSE stream.

---

## 6. Plan + pricing reality

### 6.1 Internal plan definitions (`lib/billing/plans.ts:48-108`)

| Internal ID | Display name | Price | Limits (envs / systems / executions / atrium-q / api-keys) | Features |
|---|---|---|---|---|
| `FREE` | Operator | $0 / mo · BYOK | 3 / 5 / 100 / 50 / 1 | (none) |
| `PRO` | Team | $29 / seat / mo | 10 / ∞ / 2,000 / 500 / 10 | `unlimited_systems` |
| `TEAM` | Enterprise | $79 / seat / mo internally; rendered as "Contract" | ∞ / ∞ / 10,000 / 2,000 / 50 | `unlimited_systems`, `unlimited_environments`, `team_members`, `audit_log`, `priority_support` |

The internal `TEAM` row carries `price: 79` for any self-serve checkout
that bypasses sales, but the marketing page renders "Contract" via
`priceDisplay` (line 92).

### 6.2 Marketing-page drift (`app/pricing/page.tsx:10-77`)

Reasonably consistent. Notable differences between code reality and the
public table:

| Claim on `/pricing` | Reality in code |
|---|---|
| "Operator: 10 Projects / month" | Internal `FREE` cap is `executions: 100` and `nova_queries: 50`. There is no "Project" cap in `plans.ts` — "Project" is presented as the user-facing primitive but the limit being enforced is `executions`. |
| "All real executors" on FREE | True (executors don't gate on plan today; the only gate is `enforceLimitOrResponse`). |
| "Team adoption telemetry (Trust Score per member)" on Team | Telemetry tables exist (`lib/intelligence`, `Notification`, `IntelligenceLog`) but a "Trust Score per member" computation isn't a single function; the dashboard claim is partly aspirational. |
| "Monthly ROI reports, signed for board review" on Team | `/api/environments/[id]/roi` route exists; "signed PDF" isn't in the build (no PDF signer in `package.json` beyond `pptxgenjs`). |
| "SSO (OIDC, SAML)" on Enterprise | Google + Microsoft OAuth exist; OIDC/SAML SSO does not. |
| "SCIM provisioning" on Enterprise | No SCIM endpoint in `app/api/`. |
| "Customer-managed keys (CMK)" on Enterprise | BYOK Anthropic key exists; CMK at-rest does not. |
| "Data residency (EU / UK / US)" on Enterprise | Single Vercel deployment per repo audit; no multi-region routing. |

### 6.3 Tier-cap enforcement state

`enforceLimitOrResponse` is invoked in **3 routes**:

- `app/api/nova/execute/route.ts`
- `app/api/workflows/[id]/run/route.ts`
- `app/api/executions/route.ts`

That covers Atrium's hot path (every Atrium invocation, every workflow
run, every recorded execution). Other quota dimensions on the plan
(`environments`, `systems`, `api_keys`) have no `enforceLimitOrResponse`
call against them — a Free user could create unlimited environments
today (the UI may visually warn; the API will not refuse). Combined with
the `isBetaMode()` short-circuit, plan caps are effectively advisory in
any deployment without `STRIPE_SECRET_KEY` set.

---

## 7. What's broken / partial / aspirational

### 7.1 Confirmed-broken / fallback-mode in production

| Item | Where | Effect |
|---|---|---|
| **Email verification disabled** | `lib/email-verification.ts:78-89` | If `RESEND_API_KEY` is unset, sign-up auto-stamps `emailVerifiedAt = now()` and skips sending the email. Production deploy state of this key is not in repo. |
| **Stripe in beta short-circuit** | `lib/billing/guard.ts:6-8`, `app/api/billing/checkout/route.ts:1-22` | If `STRIPE_SECRET_KEY` is unset, all plan caps + `requirePlan()` are bypassed. Outside `live` tier, `sk_live_*` keys are refused. Per `scripts/verify-stripe-config.mjs`, no Price IDs / webhook secret have been verified end-to-end against this repo. |
| **No Stripe products in test mode confirmed** | `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID` referenced but no fixtures committed | Cannot tell from repo whether even test-mode prices have been set up in Stripe dashboard. |
| **Marketing CTAs route to waitlist** | `lib/marketing-cta.ts:32-35` (current value: `'/#waitlist'` / `'Request access'`). Comment notes funnel has flipped twice (PRs #66, #78 — current state per #78 was `/sign-up` but file is back to `/#waitlist`) | Pricing, Compare, Use-cases, Blog all CTA into the waitlist anchor, not self-serve sign-up. |
| **Welcome wizard never end-to-end tested** | Per the prompt's known list. Latest fix is `1ad2f9d` "GTM-readiness sweep" with `aa21b06 Welcome flow create-env-if-missing` from prior PR. No e2e spec specifically for `/welcome` (e2e covers landing, list-pages, post-auth-flow). | First-time-user flow is unvalidated. |
| **Public sign-up gated by `GRID_PUBLIC_SIGNUP=1` in prod** | `lib/feature-flags.ts:58-61`, `app/sign-up/page.tsx:42-44`, `app/api/auth/sign-up/route.ts:36-59` | In production VERCEL_ENV the page redirects to `/#waitlist` and the API returns 403 unless an invite token is presented. Intentional for closed-beta lockdown. |
| **Local dev DB is SQLite** | `.env:15` | Schema declares `provider = "postgresql"`. SQLite locally means some schema features (JSON ops, certain indexes) aren't exercised in dev. |
| **Sentry SDK only just wired client-side** | Last commit `cd5b962` — "add instrumentation-client.ts so the SDK actually loads" | Implication: client-side Sentry was *not loading* until the most recent commit. Recovery rate / browser error visibility for the prior period is zero. |
| **Admin surfaces removed from repo** | `1a91975 Remove admin surfaces; keep internal off-tree` | Operator-side admin pages are out-of-tree; reviewers won't see how Nicole provisions invites end-to-end without that side repo. |

### 7.2 Partial / aspirational features (have rows, don't have UI or logic to match marketing claims)

- **Per-environment "Trust Score"** — implied by pricing copy and
  `AutonomyConfig` model, but no single computed score is exposed via an
  endpoint named that.
- **Atrium Academy fluency tracking** — `Course`, `Module`, `Lesson`,
  `Quiz`, `Enrollment`, `LessonCompletion` models exist. Authoring UI
  (`/learn/author`) and `/api/learn/fluency`, `/api/lessons/...` routes
  exist. End-to-end "fluency score per user" surface — partial.
- **Operational Playbook** — `OperationalPlaybook` model + `/api/playbook`
  route exist. Marketing copy mentions it; UI footprint is thin.
- **Cross-Domain Insights** — `CrossDomainInsight` model + dedicated API
  + UI under `/api/insights/cross-domain`. Demo seeding was disabled
  recently (`a8ceead`). Not a polished surface.
- **`pptxgenjs` in deps** — implies a "generate slide deck" path. No
  call site obviously wired into Atrium tool registry.
- **`reactflow@^11`** — present, used in workflow visual editor
  (`/workflows/[id]/edit`). Bridge between visual builder and prompt
  exists (`0dcad67`).
- **Public API (`/api/v1/`)** — 4 endpoints (`run`, `executions`,
  `systems`, `workflows`); no public docs route under `/docs` for them
  beyond what's hand-written.
- **"24-hour undo"** marketing claim — `Execution`/`AuditLog`/
  `PendingAction` models support this; surface is "Inline Undo on the
  Action Ledger" (`0095cfb`). Real, scoped to action-ledger, not a
  blanket app-wide undo.

### 7.3 Things that look fine on first read

- **Auth / session security**: `SEC-01..SEC-12` audit commits clustered
  late-cycle; SEC-09 hashes verification tokens at rest, SEC-04 rotates
  sessions on privilege change, SEC-12 is CSRF. Hand-rolled but the
  hardening is visible.
- **PII encryption**: Identity name/email encrypted at rest with a
  Prisma extension; `lib/auth.ts:60-72` defensively decrypts on relation
  fetches. A real bug in this area was caught and fixed
  (`53581a4 Fix PII leak — env dashboard + members APIs returned
  encrypted ciphertext`).
- **Rate limiting**: in-memory by default, distributed via Upstash if
  configured, with cost-gate strict variants (`SEC-02`).
- **Audit log**: `AuditLog` model + `/audit` UI + `/api/audit/export`
  CSV/JSONL export exist and are wired.

---

## 8. Market position (factual)

### 8.1 What CLAUDE.md says it is

> "GRID is a workspace that acts — a living business OS that reads
> every surface (docs, calendar, email, finance, code), acts with
> calibrated autonomy via Nova, and proves its work. Not a dashboard.
> Not a chatbot. Not a workflow builder. A substrate that sits
> underneath all three."
> — `CLAUDE.md:7-12`

### 8.2 What the landing page leads with

> "Management is a byproduct. Growth is the output." (h1)
> "The adaptive workspace for growth" (eyebrow)
> "Your brand lives in three design tools. Your operations live in a
> project manager. Your intelligence lives in a chat window. GRID is
> the environment they share — where the system runs itself, and growth
> is what you ship."
> — `app/page.tsx:89-98`

JSON-LD describes it as `applicationSubCategory: 'Operational
Intelligence'` (`app/page.tsx:13`).

### 8.3 Closest analogue category

In repo terms it sits as a **substrate layer** above no-code workflow
tools (Zapier-class — `lib/integrations/catalog.ts` mirrors that breadth
but routes through an LLM rather than a flowchart) and below
opinionated PM tools (Linear-class — has tasks, projects, comments,
goals, but not Linear's purpose-built issue UX). The differentiator
implied by the code is the Atrium-mediator pattern: every page exposes
the same agent surface (`PersistentAtriumBar`, `GlobalAtriumBar`), and
the agent has both a generic dispatch into 94 connected providers and
opinionated step-by-step Project execution for the most common ones.

### 8.4 Differentiation claims vs. real code

| Claim on `/pricing` or `/` | Backed by code? |
|---|---|
| "Type what you want done. Atrium writes the plan, your tools do the work" | Yes — `app/api/onboarding/build-stream/route.ts`, the Project primitive, `lib/skills/executors/`. End-to-end works for ~13 real executors. |
| "Every action explainable" | Yes — `AuditLog`, `IntelligenceLog`, `ExecutionReview`, trace persistence in `KernelTrace`, `NovaTrace` component on Inbox signals (`0ad1e1b`). |
| "24-hour undo" | Yes for action-ledger surface; not literal blanket-app undo. |
| "Override-as-teaching" | Yes — `NovaMemory` + `/api/memory/from-override` route + `bb3a09e` "Memory-from-override wire — /audit becomes the curriculum". |
| "BYOK Anthropic API" | Yes — `lib/nova/client-factory.ts`, `/settings/ai`. |
| "110+ integrations" | Literal count: 110 in registry, 94 implemented. Tool surface that Atrium is *prompted with* is 7 + meta-dispatch. |
| "Predictive Consequence Mapping" (in JSON-LD) | `ConsequenceLink`, `ConsequenceMap` component, `/api/consequences/chain` exist. Working, narrow. |
| "Operational Playbook" | `OperationalPlaybook` model + endpoint exist. |
| SSO / SCIM / data residency / CMK / signed PDF reports | Aspirational — no code. |

---

## 9. Operational state

- **Beta tier semantics** (`lib/config.ts:35-77`): `closed` (default,
  invite-only, platform key + 50K trial), `byok` (anyone signs up, must
  bring own key), `live` (planned: trial + Stripe + SSO). Local `.env`
  is `byok`. Production tier — TBD-from-vercel-dashboard.
- **Public sign-up state**: gated. Needs either `GRID_PUBLIC_SIGNUP=1`
  in env *or* a valid `?invite=<token>` URL parameter. Without one of
  those, `/sign-up` 302s to `/#waitlist` and the API returns 403
  (`lib/feature-flags.ts:58-61`, `app/sign-up/page.tsx:42-44`,
  `app/api/auth/sign-up/route.ts:36-59`).
- **Invitation flow**: invites issued from `/settings/invites`
  (admin UI added in `17a0002`), consumed at sign-up and on
  `/invite/[token]`. Waitlist → invitation path landed in `c8db7b4`.
- **User count**: TBD-from-vendor-dashboards (Postgres / Vercel).
- **Audit log**: persisted via `AuditLog` Prisma model; UI at `/audit`;
  export via `/api/audit/export` (CSV/JSONL). Immutability hardening in
  `6528ae2` "Security audit — close remaining blockers (audit
  immutability...)".
- **Cron jobs** (`/api/cron/*`): `tick`, `agents`, `errors-cleanup`,
  `sync-integrations` — protected by `GRID_CRON_TOKEN` (and
  `CRON_SECRET` for `/api/cron/agents`). Schedule lives in
  `vercel.json`.
- **Storage**: optional S3/R2/MinIO via `S3_BUCKET` env; falls back to
  `public/uploads/` (won't survive serverless redeploy). Production
  state TBD.
- **Health probes**: `/api/health` and `/api/health/ready` shipped via
  `f801d6a` "Sentry monitoring + uptime probe wiring".

---

## 10. Recently shipped (last 30 days)

`git log origin/main --since='30 days ago' --oneline | wc -l` → **204
commits**. Top items grouped thematically:

### Auth + access (lockdown → opening → invites)
- `cd5b962` Sentry: add instrumentation-client.ts so the SDK actually loads (#81)
- `c769d46` Open public signup — repoint marketing CTAs from `/#waitlist` back to `/sign-up` (#78)
- `17a0002` Admin UI for invitations — `/settings/invites` (#76)
- `c8db7b4` Invitation flow — closed-beta waitlist → account path (#70)
- `5096614` Closed-beta lockdown: gate `/sign-up` + repoint marketing CTAs to waitlist (#66)
- `1f1255e` SSO Microsoft, weekly auto-post, role fan-out start, UX polish

(Note: the prompt's existing-knowledge item — that CTAs currently route
to `/#waitlist` per `lib/marketing-cta.ts` — supersedes #78 in the
current file state. The funnel has been re-closed since #78.)

### Billing / GTM-readiness
- `1ad2f9d` GTM-readiness sweep — mobile, billing, email verification, brand discipline, plan-cap UI (#80)
- `79758bf` Hide app shell on marketing pages — full app stays behind login (#79)

### Brand + naming
- `27a8d74` Rename Nova → Atrium across user-facing surfaces (#77)
- `15390aa` Capabilities, roadmap, architecture, DPA, week-1 blog, vocab sweep
- `844aaab` Landing hero title reverted to 'Management is a byproduct / Growth is the output'

### Marketing surface
- `86a241b` Add `/research` — public front door for serious people (#75)
- `12c294e` Triadic-gap fixes: sidebar verb shift + onboarding posture screen (#74)

### Atrium / agent UX
- `ab5ef60` Global simulation-mode pill — visible on every authenticated page (#73)
- `935de4f` Per-System autonomy dial — visible from System creation onward (#63)
- `bb3a09e` Memory-from-override wire — /audit becomes the curriculum (#62)
- `0ad1e1b` NovaTrace component + inline render on Inbox signals (#61)
- `0095cfb` Inline Undo on the Action Ledger — pillar 4 (#64)

### Integrations / executors
- `e72b3f0` Adobe Creative Cloud adapter (#56)
- `42219d4`, `24f434c` Integrations readiness passes (#54, #55)
- `07ec9db` notion.upload_asset real
- `fe085a8` Real executors: canva, meta_ads (real PAUSED), google_ads + linkedin_ads (staged)
- `e19df28` Real executors: google_drive.save_file + all three Figma skills
- `4a4352a` Wire notion.fetch_document and google_calendar.draft_event to real APIs
- `05e2e5a` Three real integration executors — Notion, Slack, Gmail

### Security audit (12-item batch in late April)
- `4971340` SEC-01 fence user input + scope guard on Nova LLM calls
- `f879fa0` SEC-02 strict distributed rate limiting on cost-gate endpoints
- `a9bec3f` SEC-03 per-user daily token cap with BYOK exemption
- `47544f5` SEC-04 session rotation on privilege change
- `fb2245d` SEC-05 Airtable PKCE code_verifier in dedicated cookie
- `2d231c7` SEC-06 same-origin check on OAuth /start
- `4c42d94` SEC-07 signup is enumeration-safe
- `979f62d` SEC-08 log webhook signature failures
- `8d6772c` SEC-09 hash email verification tokens at rest
- `0045f91` SEC-10/11/12 cache-control, deployment prefix, CSRF
- `5acbf77` Security audit blockers: NovaMemory IDOR + Asset parentId IDOR + flag foot-gun (#68)
- `6528ae2` Security audit — close remaining blockers (audit immutability, finance pattern, redirect helper) (#69)
- `598576d` Tenant scoping audit + integrations visibility fix (#60)

### Stability / crash guards / cleanup
- `cb15e9d` Crash guards — 4 components assumed array shape on failed fetches (#33)
- `f7e4c20`, `331d1af` safe-fetch helper + sweep
- `6c815fc` CI cleanup: 164 lint errors → 0 (#28)

### Multi-select / polish
- `6436322` Multi-select primitives — BulkActionBar, ContextMenu, useMultiSelect (#32)
- `1fc9610` Wire BulkActionBar + ContextMenu into Goals page (#36)

204 commits in 30 days from a single primary author = high velocity, but
the velocity correlates with the hardening cluster (SEC-* batch + crash
guards + lint cleanup), suggesting the codebase only recently passed
"first real review" gates.

---

## 11. What's NOT in this description (must come from elsewhere)

The repo is silent on every commercial / business metric. To complete a
"company state" doc, these must come from outside sources:

| Category | Where it lives | Status from repo |
|---|---|---|
| Customer / signup count | Postgres production DB (`Identity`, `Subscription`, `WaitlistEntry` tables) | TBD-from-vendor-dashboards |
| MRR / ARR / paid customers | Stripe Dashboard | TBD — Stripe likely not yet collecting real revenue (beta short-circuit + waitlist gate) |
| Trial conversion / activation | `/api/metrics/activation` exists but no aggregate visible | TBD-from-vendor-dashboards |
| Churn / retention | Stripe + DB | TBD |
| Traffic / acquisition / conversion funnel | Vercel Analytics (`@vercel/analytics` is in deps) + GA / Plausible if connected | TBD-from-vendor-dashboards |
| NPS / qualitative feedback | CRM / interview notes | Not in repo |
| Financial state | Off-tree | Not in repo |
| Team count / org chart | HR | Not in repo (commits are single-author by `Niccainn`) |
| Capital / ownership state | Off-tree | Not in repo |
| Production env var values (`GRID_BETA_TIER`, `STRIPE_*`, `RESEND_API_KEY`, `SENTRY_DSN`, OAuth client IDs) | Vercel Project Settings | Local `.env` has only `byok` tier + dev DB |
| Production database hosting (Neon / Supabase / Vercel Postgres) | Vercel Storage tab | Not in repo |
| Domain / DNS / email-from address | Cloudflare / domain registrar; Resend dashboard | Not in repo (mentioned domain in JSON-LD: `https://www.grddd.com`) |
| User-facing changelog (real, not aspirational) | `/changelog` route + Stripe activity | Page exists; content TBD |
| Active design partners / pilot customers | CRM | Not in repo (CLAUDE.md / config.ts mentions "Nicole's own dogfooding, first ~10 design partners" — that's the only signal) |

---

## Confidence + freshness

- **Generated**: 2026-05-15 (per session date).
- **Repo HEAD at audit time**: `cd5b96239bf7daeb99a2095cbfa4852f322ed8bf`
  on `main`.
- **Audit type**: read-only. No code modified.
- **Coverage scope**: only what is visible in the public-repo worktree at
  the path above. Out-of-tree material — partnership briefs (`bdf13c6`),
  internal admin surfaces (`1a91975`), production env vars, vendor
  dashboards, financials — is explicitly outside this audit's reach and
  flagged in §11.
- **Caveat on counts**: provider counts double-checked against
  `lib/integrations/registry.ts`; LOC count is `find . -type f \( -name
  '*.ts' -o -name '*.tsx' \)` excluding `node_modules` and `.next`. Page
  / route counts are filesystem totals — they don't measure quality of
  any individual surface.
- **Tone**: where a marketing claim is unbacked, this doc says so.
  Where a feature exists but is staged, this doc says so. Where the
  repo can't tell us, this doc says TBD-from-X. No softening adjectives
  were introduced.
