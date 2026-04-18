# Release Checklist

Single source of truth for taking a change from local → staging → prod.
Assumes zero-cost infrastructure: Vercel free tier + Turso/Postgres free
tier + no paid monitoring SaaS. Anything marked **NO PURCHASE** must
never be swapped for a paid alternative without re-approval.

## Environments

| Env        | URL                              | Tier               | Purpose                                      |
|------------|----------------------------------|--------------------|----------------------------------------------|
| local      | http://localhost:3000            | closed             | Solo dev                                     |
| staging    | staging.grddd.com                | byok               | Pre-prod smoke tests + design-partner betas  |
| production | https://grddd.com                | closed (→ byok)    | Live user traffic                            |

All envs MUST have:
- `GRID_ENCRYPTION_KEY` set (32 bytes, base64)
- `DATABASE_URL` pointing at its OWN DB (never share prod DB with staging)
- `GRID_CRON_TOKEN` set if the cron endpoints should be active

Staging should have `STRIPE_SECRET_KEY=sk_test_…` (the billing-guardrail
code refuses `sk_live_*` outside live tier — see `lib/billing/guardrails.ts`).

## Before every release

Run locally, in order:

1. `npm test` — full Vitest suite, must be green
2. `npx tsc --noEmit -p tsconfig.json` — typecheck, must pass silently
3. `npm run build` — Next build, must succeed
4. `git status` — no unexpected modified files in the commit

## Migration step

Every merge to `main` that changes `prisma/schema.prisma` must include a
matching SQL file under `prisma/migrations/NNNN_*/migration.sql`. The
`buildCommand` in `vercel.json` runs `scripts/migrate-and-backfill.mjs`
before `next build`, so missing migrations fail the deploy loudly rather
than silently running the old schema.

## Deploy to staging

```
git push origin main
# Vercel auto-deploys. Watch the build log at vercel.com/<team>/<proj>.
```

After the build completes, run the 60-second smoke checklist:

- [ ] `GET https://staging.grddd.com/api/health` returns 200 with `status: "healthy"` or `status: "degraded"` (never `unhealthy`)
- [ ] Landing page renders
- [ ] Sign up with a new email, complete `/welcome`, land on `/dashboard`
- [ ] Trigger a scaffold from the LiveScaffoldWidget, commit it, verify systems appear
- [ ] Connect one OAuth integration (Notion is the cheapest round-trip)
- [ ] Hit `POST /api/integrations/<id>/sync` — expect `signalsCreated >= 0` and a success response (NOT `provider_not_implemented`)
- [ ] Sign out, sign back in, confirm data persists

If any step fails, revert the deploy from the Vercel dashboard before
promoting to prod.

## Promote to production

Vercel deploys `main` to both staging and prod on push by default. If
you want staging-first, configure a preview branch (`staging`) and
merge to `main` only after smoke-checking the preview.

## Rollback

Vercel dashboard → Deployments → find the last known-good deploy → "Promote to Production".
Single click, no code change required. Rehearse this at least once per
month so you know the UI before you need it in anger.

## The cron token

`GRID_CRON_TOKEN` is a shared secret between Vercel Cron (or any external
scheduler) and the `/api/cron/*` endpoints. Generate with:

```
openssl rand -base64 32
```

Set it in Vercel's env vars for production AND staging. If the token
leaks, rotate immediately — the `/api/cron/sync-integrations` endpoint
would let a leaked token kick off integration pulls (no data loss, but
wasted Anthropic credits on the tenant's BYOK key).

## Zero-cost posture

See `docs/ZERO_COST.md` for the complete "what we use, what we don't,
why" breakdown. Short version: Vercel free, DB free tier, Anthropic
BYOK, no paid monitoring. If a change requires a new paid dependency,
it requires explicit approval in writing before the PR merges.
