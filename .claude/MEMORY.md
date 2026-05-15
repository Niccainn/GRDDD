# GRID — Memory

*Evolving facts. Update as state changes. Read before acting on anything that depends on these values.*

This is the operational memory file. `CLAUDE.md` is the immutable voice + tenets doc; this file changes as the world does. When in doubt about a vendor ID, env var, or past decision — start here.

---

## Vendor accounts

| Vendor | Identifier | Purpose | Notes |
|---|---|---|---|
| **Stripe** | `acct_1TMcdwDnDLacRz1M` | Billing | Live + Test modes both under this account. Owner: Nicole. |
| **Sentry** | org `grddd`, project `javascript-nextjs` (id `4511340235980801`) | Error monitoring | DSN format: `https://<key>@o<org>.ingest.us.sentry.io/<project>` |
| **Vercel** | project `grid` (id `prj_bDjGTB6bOQrhe3Eb0GXkB3QhfbjA`), team `grdlbs` | Hosting + env | Domain `grddd.com` aliased here. Separate older `grddd` project exists but unused. |
| **Anthropic Console** | (TBD — single-account ID, holds API keys for Atrium runtime) | LLM inference | BYOK by default; `EnvironmentApiKey` rows hold user-supplied per-tenant keys |
| **Resend** | (TBD — domain not yet verified) | Transactional email | Required for email-verification flow; until set, sign-up auto-marks verified |
| **GitHub** | `Niccainn/GRDDD` | Source + PRs | Private repo. Branch protection via rulesets. |
| **Neon Postgres** | `neondb` on `ep-soft-boat-ano75jv8-pooler.c-6.us-east-1.aws.neon.tech` | Production DB | DATABASE_URL in Vercel envs |

## Production env-var inventory (per Vercel — pull `vercel env ls`)

Set + populated:
- `STRIPE_SECRET_KEY` (`sk_test_…` currently; flip to `sk_live_…` for live mode)
- `STRIPE_WEBHOOK_SECRET` (`whsec_…`; phantom — needs new endpoint registration in Stripe dashboard)
- `STRIPE_PRO_PRICE_ID` (`price_…`; currently points to non-existent test-mode price — needs recreation)
- `STRIPE_TEAM_PRICE_ID` (`price_…`; same issue)
- `GRID_BETA_TIER` = `byok`
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`, `GRID_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`

Missing (will block features when activated):
- `RESEND_API_KEY` — without it, sign-up auto-stamps `emailVerifiedAt` (dev fallback in `lib/email-verification.ts:78-89`)

## Decision log

| Date | Decision | Rationale | File |
|---|---|---|---|
| 2026-04 | BYOK Atrium during dev/beta | Externalise LLM cost; collect usage data | `lib/llm/`, `GRID_BETA_TIER` |
| 2026-04 | `GRID_BETA_TIER` gates `sk_live_*` keys | Prevent real charges before funnel ready | `lib/billing/guard.ts` |
| 2026-05 | `enforceLimitOrResponse` returns, doesn't throw | App Router can't catch `throw new Response()` cleanly | `lib/billing/cap-response.ts` |
| 2026-05 | Plan internal IDs stay `FREE/PRO/TEAM` | DB rows + Stripe metadata + audit logs reference these literals | `lib/billing/plans.ts:3` |
| 2026-05 | Display labels: Operator / Team / Enterprise | Match marketing pricing page | `lib/billing/plans.ts:name` |
| 2026-05 | Enterprise tier routes to `MARKETING_CTA` not Stripe checkout | Custom-priced ("Contract") | `app/settings/billing/page.tsx` |
| 2026-05 | `instrumentation-client.ts` re-exports `sentry.client.config` | @sentry/nextjs v10 silently ignores legacy filename | `instrumentation-client.ts` |
| 2026-05 | Atrium = user-facing name; Nova = internal (changing) | Brand for users; agent name internally | per CLAUDE.md naming |
| 2026-05 | `lib/marketing-cta.ts` single constant | PRs #66 + #78 each missed pages without it | `lib/marketing-cta.ts` |
| 2026-05 | Pre-push tsc, not pre-commit | Saves 10-15s per commit; still catches at push | `.githooks/pre-push` |
| 2026-05 | 9-agent / 5-tier Claude topology, brand-ops at top | Structured for vision, scales without re-design | `.claude/agents/` |
| 2026-05 | Skills, agents in `.claude/`; voice in `CLAUDE.md` | Anthropic-standard layout | this file |

## Landmine catalog (avoid re-discovery)

Each appended after a real failure; always include the fix.

1. **Vercel UI form race** — paste-then-fast-Save submits empty string. Always use `vercel env add` with stdin pipe (`< /tmp/value`).
2. **`vercel env pull` returns literal `\n`** in values pasted with trailing newlines. Regex-extract canonical format.
3. **@sentry/nextjs v10 silently ignores `sentry.client.config.ts`.** Requires `instrumentation-client.ts` at root.
4. **`vercel deploy` from stale checkout** ships outdated code under prod alias. Always `git pull` before deploy.
5. **`vercel env add` interactive prompt drops paste.** Always pipe via stdin.
6. **Build cache hides env-var changes.** Use `--force` on `vercel deploy` to skip cache.
7. **Asia/Tokyo TZ tripped calendar tests.** UTC fixtures must use 12:00 for TZ-stable across +14/-12.
8. **Vercel build status not a required GitHub check** at one point — PRs #39-#42 silently shipped a 1-char type error for 30 min. Ruleset must keep this required.
9. **Claude desktop tool-permission queue stalls** when dialog isn't visible. Operator agent should announce "approve X to continue" in chat.
10. **`dev` script `export $(... .env | xargs)`** breaks on values with spaces or `=`. Quote values; consider `dotenv-cli`.
11. **Repeated "fix" PRs in same area** (PRs #57-#59 all tenant-scoping) → audit pattern not applied at write time. Hence the `idor-audit` skill.
12. **SQLite-vs-Postgres CI drift.** Schema changes need a branch + CI run before merge.
13. **Soft-deleted envs still visible** (PR #57). Centralise the "include trash?" filter.

## Open product / ops decisions awaiting founder

- Email verification flow: still set `RESEND_API_KEY` and route through real verification, or stay on dev-fallback for closed alpha?
- Stripe live-mode flip: when (and which products to recreate in live)?
- Pricing-page Enterprise claims (SSO/SCIM/CMK/data residency) — soften to "roadmap" or build before flipping `MARKETING_CTA`?
- Nova → Atrium full purge (5 PRs, 776 refs): when (see `docs/NOVA-PURGE-SCOPE.md`)?
- Trust Score per-member metric — implement, or remove from pricing copy?

## Update protocol

- Vendor ID added/changed → update the table immediately
- New env var introduced → add to inventory
- New architectural decision shipped → log it (with date + file)
- Any landmine encountered → append, don't summarise; specifics save the next person

This file is read-mostly. Append, don't restructure. If the file gets > 500 lines, split into `MEMORY-vendors.md`, `MEMORY-decisions.md`, `MEMORY-landmines.md` rather than truncate.
