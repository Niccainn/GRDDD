# GRID — Claude Operations Audit
*Generated 2026-05-15 — solo founder + Claude (Anthropic Max plan)*

## TL;DR

- **31 prior Claude sessions** in `~/.claude/projects/-Users-nc-projects-grid/`. Titles + dates only; transcript-search MCP was permission-denied (see Coverage gaps).
- **81 merged PRs** on `Niccainn/grid` since the reset (PRs #31–#81). ~7 PRs/week.
- **Highest-value pattern to formalize:** the **deploy-verification loop** (build locally → push → watch Vercel → `curl /api/health` for version → bundle-scan for client SDK). Re-derived in 4+ sessions; a `verify-deploy` skill saves 10 hours.
- **Biggest landmine:** silent build / SDK failures that look green to the dashboard but are broken in prod (PRs #42, #71, #81 are all this shape).
- **Next 3 actions:** (1) approve the 4-agent topology; (2) green-light P0 skills (`verify-deploy`, `voice-check`, `stripe-mode-flip`, `vercel-env-bulk`); (3) decide the Open Questions before any subagent gets written.

## Past Claude sessions

Type / outcome inferred from titles, branches, matching PRs (transcript bodies inaccessible). Newest first; low-signal sessions collapsed.

| Date | Title | Type | Outcome | Notes |
|---|---|---|---|---|
| 2026-05-15 | Set up additional agent for GRID | ops | in-progress | This audit |
| 2026-05-14 | Define GRID marketing position | growth | drafted | Voice anchoring; did anything ship? |
| 2026-05-10 | Cross-dept feedback eval | ops | research | Department framing → this audit |
| 2026-05-10 | Check website repo records (gridlabs) | ops | research | gridlabs out of scope here |
| 2026-04-25 | Continue grid project development | code | shipped | — |
| 2026-04-24 | Add schedule meetings to calendar (+3 forks) | code | parked | TZ-stable fixtures; Asia/Tokyo flake |
| 2026-04-23 | Design GRID infrastructure landing | growth | shipped | — |
| 2026-04-23 | grddd.dev1–4 (PRs #6, #8) | code | shipped | — |
| 2026-04-23 | Implement GRID Philosophy framework | growth | drafted | Philosophy → CLAUDE.md voice rules |
| 2026-04-23 | Define ICP (PR #9) | growth | shipped | ICP framing |
| 2026-04-23 | Fix AuditLog tenant guard | code/sec | shipped | Tenant-scoping audit pattern |
| 2026-04-23 | Scope operate-data queries | code/sec | shipped | Same pattern |
| 2026-04-20 | Marketing campaigns for top users | growth | drafted | — |

7 more sessions were `Check latest grid updates`-style review passes (omitted), and several private planning sessions are kept off-record. **Signal:** growth is frequent enough to warrant its own agent; the **fork-and-explore** pattern (calendar fork 1/2/3) shows Nicole's process already does parallel agents in spirit.

## Repo state snapshot

**Git** — `main` at `cd5b962` (PR #81, Sentry fix). 21 active worktrees under `.claude/worktrees/`; 8 hold unmerged claude branches. Recent PRs (#71–#81) cover Sentry monitoring + the v10 SDK landmine (#71, #81), GTM-readiness sweep (#80), open public signup (#78), Atrium rename (#77), `/research` (#75), invite flow (#70), security audits (#68, #69) — all in 9 days.

**`.claude/` is greenfield for phase 2:** `.claude/settings.local.json` (168 one-off `Bash(...)` allow entries, no hooks, no env block); `.claude/launch.json` (dev preview). **No `agents/`, `skills/`, `commands/`, or project `settings.json`.**

**`package.json` scripts of note:** `check:integrations` (registry/catalog drift, in CI), `check:stripe` (end-to-end Stripe verify), full test ladder (`test:integration`, `test:e2e`, `test:nova-eval`, `test:load[:steady|:burst]`). `dev` script does `export $(grep -v '^#' .env | xargs)` — silent footgun on values containing spaces.

**Pre-push hook (`.githooks/pre-push`)** runs `prisma generate` + `tsc --noEmit`, filters `.next/types/` noise. Added in PR #46 because PRs #39–#42 silently shipped a 1-char type error for 30 min through three "successful" merges.

**Quoted verbatim from `CLAUDE.md`** (lines 50–51, 73, 75):

> **Additive, not destructive.** New features layer onto existing surfaces. Rewrites that clear what a user sees are a failure mode.
> Don't create documentation files (`*.md`, `README.md`) unless explicitly requested.
> Don't add emoji to shipped UI. Anywhere.

## Pattern catalog

### 1. Deploy-verification loop (highest reuse)
**Trigger:** merge to `main`, env change, vendor SDK upgrade.
**Steps:** push → `vercel deploy --prod --yes` from a *fresh* checkout → `curl https://grddd.com/api/health`, parse `version`, compare to `git rev-parse HEAD` → if SDK-bearing, view-source and grep for the SDK string → check `vercel inspect` logs.
**Verify:** `version` matches HEAD AND surface behaves correctly.
**Fail modes:** stale checkout under prod alias; cache serves stale shell; literal `\n` in `vercel env pull`; SDK in `package.json` but not bundle.

### 2. Vercel env bulk write
**Trigger:** Stripe flip, key rotation, new env across 3 environments.
**Steps:** clipboard → file (`pbpaste > /tmp/var.txt`) → `vercel env add NAME production < /tmp/var.txt` (stdin pipe). Repeat per env.
**Fail modes:** UI form race submits empty on fast paste-then-Save; interactive prompt drops paste; multi-line secrets get `\n` literals on pull.

### 3. Stripe test → live mode flip
**Trigger:** GTM cutover, plan price change.
**Steps:** rotate **5 envs** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `NEXT_PUBLIC_STRIPE_PUB_KEY`) × 3 environments; recreate **2 products** in live mode; create **1 webhook** at `/api/webhooks/stripe` with live signing secret; **1 deploy**.
**Verify:** `npm run check:stripe` passes; Stripe webhook log shows 200; `GRID_BETA_TIER` set correctly.
**Fail modes:** missing one env → silent fall-back to test mode; webhook secret swapped but not deployed → 400s; `sk_live_*` rejected because beta-tier flag is wrong.

### 4. @sentry/nextjs v10 client init (PR #81)
**Trigger:** adding/upgrading Sentry; DSN set but no events.
**Steps:** create `instrumentation-client.ts` at root re-exporting `./sentry.client.config`. Don't delete the legacy file (re-export keeps both in lockstep).
**Fail modes:** `sentry.client.config.ts` silently ignored by v9+; env var inlined into a tree-shaken file; onboarding wizard sits forever waiting for first event.

### 5. Marketing CTA single-toggle (`lib/marketing-cta.ts`)
**Trigger:** opening or closing public sign-up.
**Steps:** edit two fields (`href`, `label`). Done. Home (`app/page.tsx`) intentionally still uses inline `#waitlist` for `<WaitlistForm>` focus.
**Fail modes:** PRs #66 and #78 each missed pages until the constant existed.

### 6. Plan rename keeping internal IDs stable
**Trigger:** marketing wants `PRO` → `Studio`.
**Steps:** keep `PlanType = 'FREE' | 'PRO' | 'TEAM'` (DB rows, Stripe priceIds, audit logs reference these). Change *only* `PLANS[id].name` + `description`.

### 7. Pre-push tsc gate
**Steps:** runs automatically. `tsc --noEmit` after `prisma generate`. Don't `--no-verify`.

### 8. Tenant-scoping / IDOR audit (PRs #60, #68, #69)
**Trigger:** new `/api/[entity]/[id]` route, new `findUnique({ where: { id } })`.
**Steps:** every fetch includes caller's `environmentId` or `accountId`. Every Asset / NovaMemory mutation verifies ownership before write. Use `getAuthIdentityOrNull` + redirect (never throw on auth in App Router pages). `enforceLimitOrResponse` returns instead of throws (App Router can't catch throw-Response cleanly).

### 9. Event-driven sync (CLAUDE.md tenet)
**Trigger:** mutation needing sidebar / list / switcher refresh without page reload.
**Steps:** fire `grid:{entity}-changed` custom event after mutation; subscribe in components that refetch.

## Decision log

| Decision | Why | Where |
|---|---|---|
| BYOK Atrium during dev/beta | Externalise LLM cost; collect usage data | `lib/llm/`, `GRID_BETA_TIER` |
| `GRID_BETA_TIER` gates `sk_live_*` | Don't take real payments before funnel is ready | `lib/billing/guard.ts` |
| `enforceLimitOrResponse` returns, not throws | App Router can't catch throw-Response cleanly | `lib/billing/cap-response.ts` |
| `instrumentation-client.ts` re-exports `sentry.client.config` | Keeps both filenames in lockstep until v11 | `instrumentation-client.ts:23` |
| Pre-push tsc, not pre-commit | tsc takes 10–15s; cheaper at push than per commit | `.githooks/pre-push:33` |
| `lib/marketing-cta.ts` single constant | Two flips (#66, #78) each missed pages | `lib/marketing-cta.ts:30` |
| Plan internal IDs stay `FREE/PRO/TEAM` | DB rows, Stripe priceIds, audit logs reference literals | `lib/billing/plans.ts:3` |
| `safe-fetch` helper + ESLint rule | Crash-on-bad-shape was 4 components in PR #33 | `lib/api/safe-fetch.ts` |
| Notion-style trash for envs (PR #53) | Hard-delete violates "additive, not destructive" | `feat/environment-soft-delete-and-trash` |
| `Atrium` user-facing, `Nova` internal (PR #77) | Brand for users; mediator name in code | per CLAUDE.md naming |
| `/dashboard` is post-login home (PRs #40, #43) | Bouncing to `/environments/<slug>` lost context | `middleware.ts` |

## Landmine catalog

1. **Vercel UI form race** submits empty on fast paste-then-Save. Use `vercel env add` + stdin pipe.
2. **`vercel env pull` returns literal `\n`** in some multi-line values; regex-extract.
3. **`@sentry/nextjs` v10 silently ignores `sentry.client.config.ts`.** Symptom: empty inbox, env seems set, no console error. Fix: `instrumentation-client.ts` at root.
4. **`vercel deploy` from stale checkout** ships wrong code under prod alias. Always deploy from fresh `git pull`.
5. **`vercel env add` interactive prompt drops paste.** Use stdin pipe.
6. **Asia/Tokyo TZ tripped calendar tests** — UTC fixtures must use noon (12:00 UTC) to be TZ-stable across +14/-12.
7. **Vercel build status not a required GitHub check** — PRs #39–#42 silently shipped a 1-char type error for 30 min. Required-check config must stay set in branch protection.
8. **Claude desktop tool permission queue stalls** when user can't see the dialog. Operator subagent should announce "approve X to continue" in chat.
9. **`dev` script `export $(... .env | xargs)`** breaks on values with spaces or `=`. Quote values; consider `dotenv-cli`.
10. **Repeated "fix" PRs in same area** (PRs #57, #58, #59 all tenant-scoping) → audit pattern not applied at write time.
11. **SQLite-vs-Postgres CI drift.** Schema changes need a branch + CI run before merge.
12. **Soft-deleted envs still visible** (PR #57). Centralise the "include trash?" filter.

## Proposed agent topology

Four department-style subagents. Routing by intent, not file path; one agent owns each domain end-to-end.

### `engineer` — code, tests, deploys, security, deps
Read+write on `app/`, `lib/`, `components/`, `prisma/`, `scripts/`, `.github/workflows/`, tests. Bash for `npm`, `prisma`, `tsc`, `git`, `gh`, `vercel`. Does NOT write copy or touch marketing surfaces.
**Routes here:** "Add autosave to the Inbox triage form." · "Why is `/environments` 500ing in preview but not prod?" · "Run the IDOR audit on `/api/forms/[id]/responses`." · "Bump `@sentry/nextjs` to v11 and verify events." · "Convert the Goals page fetch to `safeFetch`."

### `operator` — env vars, vendor configs, runbooks, incident response, deploy verify
Bash for `vercel`, `gh`, `curl`, `psql`, `scripts/restore-drill.sh`. Read-only on most code. Line: "behind a vendor login → operator; `.ts` file → engineer".
**Routes here:** "Flip Stripe to live mode." · "Rotate the Anthropic API key everywhere." · "Run the Postgres restore drill." · "Why are no Sentry events arriving from prod?" · "Verify the deploy at HEAD is live on grddd.com."

### `growth` — marketing copy, landing pages, voice/tone, narratives
Read+write on `app/(marketing)/**`, `lib/marketing-cta.ts`, `components/marketing/**`, `public/marketing/**`. May invoke `engineer` for component changes. Does NOT decide pricing numbers.
**Routes here:** "Rewrite the home hero — too marketing-y per voice rule 1." · "Draft the next weekly narrative about the autonomy dial." · "Sweep marketing copy for 'unleash', 'empower', 'seamless'." · "Add `/use-cases/agencies` following the `/use-cases/solo` pattern." · "Audit landing page against CLAUDE.md visual discipline."

### `finance` — Stripe state, plan mechanics, billing, churn
Read+write on billing surfaces. Bash for `stripe` CLI, `npm run check:stripe`. Read on Prisma; schema changes require `engineer` review. Does NOT rotate keys (operator) or style the pricing page (growth).
**Routes here:** "Add a `Studio` plan between Pro and Team — same TEAM internal ID, new label." · "What's our current MRR / activation rate?" · "Webhook firing but Account row isn't updating — debug." · "Add a 14-day trial to PRO." · "CSV of accounts on FREE for >30 days with non-zero usage."

**Routing default:** if none match, drop into the main thread. Don't invent a fifth agent.

## Proposed skill list

| Name | P | Trigger | Lines | Owner |
|---|---|---|---|---|
| `verify-deploy` | P0 | "is X live", any push to main | 60 | operator |
| `voice-check` | P0 | edit to `app/(marketing)/**`; any shipped string >10 words | 40 | growth |
| `stripe-mode-flip` | P0 | "flip stripe", env var named `STRIPE_*` | 80 | operator + finance |
| `vercel-env-bulk` | P0 | "rotate", "set env on all environments", `vercel env` invocation | 50 | operator |
| `idor-audit` | P0 | new `app/api/[entity]/[id]/route.ts`, new `findUnique({ where: { id } })` | 70 | engineer |
| `sentry-debug` | P1 | "no sentry events", any `@sentry` import diff | 50 | operator |
| `safe-fetch-sweep` | P1 | new client `fetch().then(r => r.json())` | 30 | engineer |
| `event-sync-wire` | P1 | new mutation handler; "why didn't sidebar update" | 40 | engineer |
| `plan-rename` | P1 | "rename plan"; edit to `lib/billing/plans.ts:name` | 30 | finance |
| `marketing-cta-flip` | P1 | "open signup"; edit to `lib/marketing-cta.ts` | 25 | growth |
| `restore-drill` | P2 | "run restore drill"; "are backups sound" | 30 | operator |
| `tz-stable-fixtures` | P2 | new `__tests__/**` touching dates | 25 | engineer |
| `additive-not-destructive` | P2 | any PR deleting >50 lines of UI | 30 | engineer + growth |

P0 = ship before next deploy. P1 = ship in next two weeks. P2 = nice-to-have.

## Open questions for Nicole

1. **Single `CLAUDE.md` vs per-agent prompts.** Current 80-line `CLAUDE.md` is shared (good for voice, awkward for engineer-only context). Split into `CLAUDE.md` + `agents/*.md`?
2. **`Atrium` vs `Nova` everywhere.** Recommend internal docs keep "Nova" (per CLAUDE.md naming); user-visible says "Atrium". Confirm.
3. **Prune the 21 stale worktrees?** Many reference closed PRs and merged claude branches.
4. **Where do growth drafts live?** Drafts surfaced in past sessions had no central home. Notion? `docs/growth/`? Google Drive when MCP is wired?
5. **`finance` direct Stripe API write?** Currently all rotation runs via dashboard. Direct write saves time, increases blast radius.
6. **Hooks in `settings.json`.** Want a `Stop` hook running `npm run lint` + `tsc --noEmit`? A `PreToolUse` hook for `git push` that confirms the diff?
7. **Permission allowlist hygiene.** 168 one-off entries in `settings.local.json`. Consolidate to pattern allows? Widens blast radius.
8. **`gridlabs` repo scope.** May 10 session was in `/Users/nc/projects/gridlabs/`. In scope or separate world?
9. **Cost discipline.** Cap subagent depth at 1 (no subagent-spawning-subagent)?
10. **Failure-mode logging.** When a subagent hits a landmine, auto-append to this file's § Landmine catalog, or a separate `docs/INCIDENT_LOG.md`?

## Suggested phase 2 sequencing

1. **Decide the open questions.** Nothing else gets written until 1, 2, 5, 6, 9 are settled.
2. **Write four `agents/*.md` prompts** (60–120 lines each). Test by issuing one prompt per agent.
3. **Ship four P0 skills** in order: `verify-deploy`, `vercel-env-bulk`, `stripe-mode-flip`, `voice-check`.
4. **Add a project `settings.json`** with a `Stop` hook (`npm run lint`), the allow-list consolidation from #7, and an env block scoping APIs per agent.
5. **Ship P1 skills** (`idor-audit`, `sentry-debug`, `safe-fetch-sweep`, `event-sync-wire`, `plan-rename`, `marketing-cta-flip`).
6. **Garbage-collect stale worktrees** (needs #3 first).
7. **`Stop` hook** that appends a "what just shipped" line to this file when a session ends with `gh pr merge`.
8. **P2 skills** when convenient.

## Coverage gaps

- **Session transcript bodies** — `mcp__ccd_session_mgmt__search_session_transcripts` was permission-denied this run. Patterns and decisions reconstructed from PR titles, commit messages, repo files, and the prompt's examples. A re-run with that MCP allowed would surface 5–10 more landmines.
- **Cross-repo `gridlabs`** — out of scope per the prompt.
- **Per-PR diffs** — only titles + merge dates scanned.
- **Anthropic API usage / cost** — no telemetry in repo, console not queried. Open question #9 is unbacked by data.

---

**Output file:** `/Users/nc/projects/grid/.claude/worktrees/trusting-torvalds-11563a/docs/CLAUDE-OPERATIONS-AUDIT.md`
