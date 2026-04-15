# Deploying GRID

This guide walks a clean-slate deploy from laptop to a live Vercel URL
with production-grade posture. Budget ~1 hour end-to-end if every
account is ready; ~3 hours if you're also creating Neon / Resend /
Sentry accounts from scratch.

## What you're standing up

- **Vercel** — hosts the Next.js app and runs cron
- **Neon** (or Vercel Postgres / Supabase) — managed Postgres for Prisma
- **Resend** — transactional email (verification + future notifications)
- **Sentry** — error monitoring (optional for alpha, required for public)
- **GitHub Actions** — daily off-site Postgres backups
- **Anthropic** — model API

None of these except Vercel + Postgres + Anthropic are strictly required
to boot the app — every optional integration is env-gated and becomes a
no-op when unset. You can launch alpha with the minimum, then layer in
the rest as you grow.

## 1. Provision Postgres

**Neon** (recommended for solo / bootstrapped):
1. Sign in at https://neon.tech, create a project called `grid`
2. Copy the connection string from Dashboard → Connection Details
3. Use the pooled URL with `?sslmode=require&pgbouncer=true` for
   runtime, unpooled for migrations

**Vercel Postgres** also works — Storage → Create Database → copy
`POSTGRES_PRISMA_URL`.

## 2. Apply the schema

From your laptop, pointing at the fresh DB:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npm run db:seed   # optional seed data
```

If you don't have migrations yet (first deploy), use `prisma db push`
once to create the schema, then commit a baseline migration for
future deploys:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
```

## 3. Create the Vercel project

```bash
npm i -g vercel
vercel link
```

Then in the Vercel dashboard → Project → Settings → Environment
Variables, set every **REQUIRED** variable from `.env.example`. At
minimum:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-…` |
| `GRID_CRON_TOKEN` | `openssl rand -hex 32` |
| `GRID_WEBHOOK_TOKEN` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-vercel-url.vercel.app` |

Optional but recommended:

| Key | Value |
|---|---|
| `GRID_DAILY_BUDGET_USD` | `10` |
| `RESEND_API_KEY` | from https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | `Grid <noreply@yourdomain.com>` |
| `SENTRY_DSN` | from Sentry project → Settings → Client Keys |

**Do not** set `GRID_ENABLE_DEMO` in production. The demo workspace is
auto-disabled outside dev/preview.

## 4. Deploy

```bash
vercel --prod
```

The build command in `vercel.json` runs `prisma generate && prisma
migrate deploy && next build`, so the first deploy applies migrations
automatically.

## 5. Set up cron

Vercel Cron (recommended) — add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/tick", "schedule": "* * * * *" }]
}
```

Or use an external scheduler. Every caller must send:

```
x-grid-cron-token: <value of GRID_CRON_TOKEN>
```

The endpoint fail-closes if the env var is unset.

## 6. Enable backups

1. In GitHub → Settings → Secrets → Actions, set `DATABASE_URL`
2. The workflow at `.github/workflows/backup.yml` will run daily at
   03:17 UTC and upload a gzipped dump as a retained artifact
3. For off-site storage, set `BACKUP_UPLOAD_CMD` to a shell command
   that uploads `$1` to your bucket of choice

## 7. Smoke tests

```bash
# Health — should 200
curl https://your-url.vercel.app/api/health

# Sign up flow
curl -X POST https://your-url.vercel.app/api/auth/sign-up \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"you+test@domain.com","password":"a-strong-password-12"}'

# Cron — should 401 without token
curl -X POST https://your-url.vercel.app/api/cron/tick
# then with the token — should 200
curl -X POST https://your-url.vercel.app/api/cron/tick \
  -H "x-grid-cron-token: $GRID_CRON_TOKEN"
```

## 8. Post-deploy verification

Walk through every item at `/privacy` and `/terms` — if anything is
inaccurate for your actual deployment (sub-processor list, retention
windows, contact email), edit the pages before you share the URL.

## Production readiness checklist

Security / correctness (✅ = shipped in this repo):

- [x] Multi-tenant isolation audit — every route scoped to owner
- [x] Session cookie `sameSite=strict` (CSRF defense)
- [x] CSP, HSTS, X-Frame-Options DENY, Referrer-Policy
- [x] Rate-limited auth endpoints + email lockout
- [x] Bcrypt 12-round password hashing
- [x] 12-character minimum password
- [x] PII redaction before trace persist
- [x] 30-day trace retention (auto-purge)
- [x] Per-tenant daily cost cap (circuit breaker)
- [x] Email verification (env-gated)
- [x] Security headers on every response
- [x] Demo workspace dev-only

Operations:

- [x] Daily automated backups (GitHub Actions)
- [x] Error monitoring facade (SENTRY_DSN)
- [x] `.env.example` documented
- [x] Deploy runbook (this file)
- [ ] Uptime monitoring — set up Better Stack / UptimeRobot pointed at `/api/health`
- [ ] Anthropic DPA signed (required for GDPR sub-processor compliance)

Legal:

- [x] `/privacy` page
- [x] `/terms` page
- [x] Consent banner with AI disclosure
- [ ] Email `privacy@yourdomain.com` configured to reach a human
- [ ] Right-to-erasure flow (currently: email us → manual delete)
- [ ] Right-to-portability flow (currently: email us → manual export)

The items still unchecked are fine to carry into a closed alpha but
should be closed before a public launch with self-serve signup.
