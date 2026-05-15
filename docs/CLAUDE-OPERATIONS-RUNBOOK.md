# GRID — Claude Operations Runbook

*How Claude works for GRID. Read this first when you come back after time away.*

Solo founder + Claude. Anthropic Max plan. This doc is the orientation layer — 10 minutes to re-load the whole operational context.

---

## The model in one paragraph

GRID's Claude setup is three layers. **`CLAUDE.md`** (repo root) is the constitution — voice, visual discipline, architecture tenets, naming. It never changes casually. **`.claude/MEMORY.md`** is the evolving facts — vendor IDs, env-var inventory, decision log, landmine catalog. It's append-mostly. **`.claude/agents/` + `.claude/skills/`** are the operators — nine department-shaped agents and thirteen codified procedures. You talk to Claude; Claude routes to the right agent; the agent invokes the right skill.

## The agent topology (5 tiers, 9 roles)

```
Tier 0 — Governance
└── brand-ops          ACTIVE   voice/visual/tenets; reviews everything customer-facing

Tier 1 — Build
├── product            STUB     activates pre-launch — roadmap, specs, prioritisation
├── design             STUB     activates Q+1 — UX, visual system, components
└── engineer           ACTIVE   code, tests, deploys, security, deps

Tier 2 — Run
├── operator           ACTIVE   env vars, vendor configs, runbooks, deploy verify
└── data               STUB     activates day-of-launch — analytics, evals, retention

Tier 3 — Grow
├── growth             ACTIVE   marketing copy, landing review, voice enforcement
└── finance            ACTIVE   Stripe, plan mechanics, billing, churn

Tier 4 — Serve
└── support            STUB     activates day-of-launch — customer replies, churn signal
```

**5 active, 4 stubs.** Stubs have a file (the slot is defined) with activation criteria. When the criterion hits, replace the stub with a full prompt — no re-design needed. Activation order: `product` (pre-launch) → `support` + `data` (day-of-launch) → `design` (Q+1).

### How routing works

You don't pick the agent. You describe the work; Claude reads the agent `description` frontmatter and routes. Examples:

- "Why is `/environments` 500ing in preview?" → `engineer`
- "Flip Stripe to live mode" → `operator` + `finance`
- "Rewrite the home hero, too marketing-y" → `growth` → reviewed by `brand-ops`
- "What's our MRR?" → `finance` (currently returns "needs vendor dashboard" — repo has no revenue data)
- "Should we ship X or Y first?" → `product` stub → escalates to founder (not active yet)

If nothing matches, it stays in the main thread. There is intentionally no fifth catch-all agent.

## The skills (13 codified procedures)

Skills are the muscle memory. Each is a `SKILL.md` with: when-to-invoke, procedure (executable bash), verification, failure modes, owner.

| Skill | Priority | What it prevents |
|---|---|---|
| `verify-deploy` | P0 | "I deployed but it's not live" — cache-bust + bundle scan |
| `voice-check` | P0 | Banned words / emoji / wrong casing reaching customers |
| `vercel-env-bulk` | P0 | The Vercel UI form race that silently saves empty strings |
| `stripe-mode-flip` | P0 | Half-flipped Stripe (5 envs + 2 products + webhook must move together) |
| `idor-audit` | P0 | Tenant data leaking through unscoped `findUnique` |
| `sentry-debug` | P1 | SDK silently missing from bundle (the v10 filename trap) |
| `safe-fetch-sweep` | P1 | "API returned wrong shape, component crashed" |
| `event-sync-wire` | P1 | "Why didn't the sidebar update" |
| `plan-rename` | P1 | DB migration triggered by a cosmetic label change |
| `marketing-cta-flip` | P1 | Opening/closing signup but missing a marketing surface |
| `restore-drill` | P2 | Backups that don't actually restore |
| `tz-stable-fixtures` | P2 | Date tests that pass locally, fail in CI/other TZ |
| `additive-not-destructive` | P2 | "Cleanup" PRs that delete a surface users depend on |

To invoke: just describe the situation. "Is the latest deploy live?" pulls `verify-deploy`. "Set the Resend key" pulls `vercel-env-bulk`.

## The hooks (settings.json)

Two hooks, deliberately narrow. They guard the operations that have actually burned us — not every action.

- **PreToolUse → `.claude/hooks/guard.sh`** blocks (asks for confirmation): force-push to main, `vercel env rm production` without a re-add, Stripe live writes, `--no-verify` push, destructive git, `rm -rf` outside `/tmp`.
- **Stop → `.claude/hooks/stop-check.sh`** advisory: surfaces uncommitted changes, unpushed commits, TS files changed without tsc, at session end.

The permission allowlist in `settings.json` uses pattern allows (`Bash(git status:*)`, `Bash(vercel ls:*)`) instead of the 168 one-off entries that had accumulated in `settings.local.json`. Routine read operations don't prompt; writes to env/Stripe/force-push are in the `ask` list.

## The memory (`.claude/MEMORY.md`)

The fact sheet. Vendor IDs (Stripe `acct_1TMcdwDnDLacRz1M`, Sentry org `grddd`, Vercel project `grid`), the production env-var inventory, the decision log (why internal plan IDs stayed `FREE/PRO/TEAM`, etc.), and the landmine catalog (13 traps with fixes). When a vendor ID changes, an env var is added, or a decision ships — append here. When something breaks — append the landmine with its fix, specifics not summary.

## The supporting docs

| Doc | Purpose | Update cadence |
|---|---|---|
| `CLAUDE-OPERATIONS-AUDIT.md` | Point-in-time audit of all prior Claude work, patterns, decisions | Static — regenerate quarterly if useful |
| `GRID-MARKET-STATE.md` | Brutally factual current state — what's shipped vs aspirational, file:line evidence | Regenerate before any external conversation that needs ground truth |
| `NOVA-PURGE-SCOPE.md` | The 776-reference Nova→Atrium rename plan, 5-PR sequence | Static until the purge ships, then archive |
| `INCIDENT_LOG.md` | Append-only failure log; agents auto-append when they hit a landmine | Continuous |

## Common workflows

**"Ship a code change"** → `engineer` writes it → `tsc` (pre-push hook enforces) → PR → `verify-deploy` skill confirms it's live. If it touched user-visible copy, `brand-ops` reviews via `voice-check` first.

**"Set/rotate a secret"** → `operator` via `vercel-env-bulk` skill (clipboard → file → stdin pipe; never the UI) → `--force` redeploy → length-verify.

**"Open public sign-up"** → all prod-side gates verified (Stripe, email, OAuth) → `growth` flips `lib/marketing-cta.ts` via `marketing-cta-flip` skill → `operator` confirms `isPublicSignupEnabled()` feature flag aligns → deploy → verify.

**"Come back after a break"** → read this runbook → read `MEMORY.md` (what's the current state) → read `INCIDENT_LOG.md` (what broke recently) → check open todos.

## What's deliberately NOT here

- **Fundraising / pitch / valuation** material — lives off-tree at `~/projects/grid-private/`. A `.githooks/pre-commit` guard blocks these watchwords from shipped docs. Don't reference them in anything in this repo.
- **gridlabs** — a separate website, a separate world. Not in any agent scope.
- **Growth strategy / GTM trajectory** — being re-evaluated from a clean slate post-organisation. The `growth` agent owns copy execution, not strategy. Strategy is founder + (eventually) `product`.

## Activation checklist for a stub agent

When a stub's criterion hits:
1. Read its activation checklist (in the stub file)
2. Read the source-of-truth files it lists
3. Replace the stub body with a full prompt (use an active agent as the template — scope, source-of-truth, workflow, hard rules, hand-off, landmine-logging)
4. Wire its skills (create the `SKILL.md` files)
5. Add any agent-specific hooks to `settings.json`
6. Note the activation in `MEMORY.md` decision log

---

*This runbook is the orientation layer. The constitution is `CLAUDE.md`. The facts are `MEMORY.md`. The operators are `.claude/agents/` + `.claude/skills/`. Everything else is detail you can pull when you need it.*
