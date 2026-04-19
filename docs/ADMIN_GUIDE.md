# GRID — Admin Guide

For the human running the GRID deployment (the operator). Covers
env-var configuration, monitoring posture, day-0 setup, release
process, and recurring responsibilities.

## Who this is for

One person per GRID deployment holds the **operator** role — the
account whose email matches the `GRID_ADMIN_EMAIL` env var. That
person has:

- Access to `/admin` (all other routes respect normal tenant scoping)
- Responsibility for env-var configuration
- Responsibility for domain + DNS setup
- Responsibility for incident response (see `docs/INCIDENT_RESPONSE.md`)

## Day-0 setup checklist

Do in order. Each step is a single action.

### Environment variables in Vercel

All set via **Vercel → Project → Settings → Environment Variables**.
After any change, **Redeploy** (Settings change doesn't auto-rebuild).

**Required** (deploy fails or sign-up breaks without these):

| Variable | Value | Source |
|---|---|---|
| `DATABASE_URL` | `postgresql://…` | Your DB provider (Turso, Neon, Supabase) |
| `GRID_ENCRYPTION_KEY` | 32 bytes base64 | `openssl rand -base64 32` — generate once, never rotate without re-encrypt plan |

**Strongly recommended** (degrades to warnings without these):

| Variable | Value | Purpose |
|---|---|---|
| `GRID_CRON_TOKEN` | 32 bytes base64 | `openssl rand -base64 32` — authorises `/api/cron/*` |
| `GRID_ADMIN_EMAIL` | your@email | Gates `/admin` dashboard |
| `NEXT_PUBLIC_APP_URL` | `https://grddd.com` | OAuth redirect URIs, email links |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Platform trial key for closed-beta users (used only when tenant hasn't brought their own) |
| `RESEND_API_KEY` | `re_…` | Transactional email |
| `RESEND_FROM_EMAIL` | `"Grid <onboarding@yourdomain.com>"` | From-address |
| `GRID_BETA_TIER` | `closed`, `byok`, or `live` | Default `closed` — restricts public signup |

**Optional** (features activate when present):

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Billing (must be `sk_test_*` outside `live` tier) |
| `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID` | Plan IDs from Stripe dashboard |
| `STRIPE_BETA_TRIAL_DAYS` | Override default 30-day trial during beta |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting |
| `SENTRY_DSN` | Error tracking (not required — self-hosted AppError works without it) |
| `GRID_ERROR_RETENTION_DAYS` | Default 30. Minimum 7 |
| `{PROVIDER}_CLIENT_ID`, `{PROVIDER}_CLIENT_SECRET` | OAuth apps for each provider you want enabled. See `docs/INTEGRATIONS_SETUP.md` |

### DNS setup

Required for email to work:

1. Resend → Domains → add `yourdomain.com`
2. Copy the four records (SPF, DKIM, return-path)
3. Paste into your DNS registrar
4. Wait 5-15 min for verification
5. Resend dashboard shows green check

Required for the app itself:

1. Vercel → Domains → add `grddd.com` (or whatever you own)
2. Vercel issues CNAME or A record; paste at registrar
3. Verify propagation: https://dnschecker.org

### OAuth apps

One per provider you want to enable. See `docs/INTEGRATIONS_SETUP.md`
for the full table. The minimum realistic set for a creative-studio
or SMB launch:

- **Google** (Calendar + Drive + Workspace share one app) — for calendar sync
- **Notion** — for knowledge sync
- **Slack** — for signal inflow
- **GitHub** — for dev-team tools
- **HubSpot** — for CRM signals

Each takes 5-10 min.

### Monitoring

Zero-cost posture (recommended):

- **UptimeRobot** free tier → point at `https://grddd.com/api/health`
  → alert on any non-2xx. Free forever, 5-min interval.
- **Vercel's built-in deploy alerts** → Vercel → Project Settings →
  enable email-on-failed-deploy.

Later, if you want more:

- **Sentry free tier** (5K events/mo) — swap the self-hosted AppError
  for forwarded events. One-line change in `lib/observability/errors.ts`.
- **Better Stack / Betterstack** (formerly Logtail) has a reasonable
  free tier for log-forwarding.

## The `/admin` dashboard

Once `GRID_ADMIN_EMAIL` is set and matches your identity, `/admin`
renders:

- **Counters**: identities, environments, systems, integrations
- **Deployment panel**: commit SHA, deploy date, last signal received, consent logs (7d)
- **Errors (24h)**: AppError rows grouped by scope + level
- **Integration health**: per-integration lastSyncedAt + lastError
- **Deep links**: `/api/health`, `/subprocessors`, `/security`, `/changelog`

Read-only. Any action requiring a mutation has its own authenticated
endpoint with confirmation UX.

## Daily responsibilities

A 2-minute routine (or set a cron):

1. Open `/admin`
2. Scan "Errors (24h)" — any `error` level scope with unusual volume?
3. Scan "Integration health" — any row with a red error badge?
4. If UptimeRobot alerted in the last 24h, read the incident

If nothing's red, you're done.

## Weekly responsibilities

- Review consent-log activity — looking for odd spikes
- Check AppError table size (auto-truncates at 30d but spot-check)
- Review Vercel deploy history — any failed deploys you missed?
- Review Stripe dashboard for unexpected charges (defensive)
- Read the `/changelog` — does the published history match what actually shipped?

## Monthly responsibilities

- **Backup restore drill** — restore last night's DB backup to a
  fresh Postgres instance, run `npm run build` against it, hit `/api/health`.
  Document the result.
- **Dependency audit** — `npm audit --omit=dev --audit-level=high` in
  a local checkout. Upgrade any high/critical.
- **Access review** — look at the Identity table. Any accounts that
  shouldn't be there?

## Quarterly responsibilities

- **Incident runbook drill** — pick a hypothetical SEV-2, walk the
  6-step process in `docs/INCIDENT_RESPONSE.md`. Log in `docs/incidents/drills/`.
- **Pen test rotation** — if you have a paid HackerOne program or a
  regular contractor, schedule the next window.
- **ToS + Privacy review** — have either policy changed? If yes, bump
  `POLICY_VERSION` in `lib/consent/log.ts` and the sign-in flow
  prompts re-consent.

## Release process

### To ship a feature

1. Code on a feature branch
2. PR to `main` — CI runs tests + typecheck + build
3. Merge
4. Vercel auto-deploys to production
5. Watch `/api/health` and `/admin` error panel for 10 min
6. If healthy, done

### If the deploy fails

See `docs/TROUBLESHOOTING.md` → Admin / operator section. Most common:

- GitHub webhook disconnected → reconnect in Vercel Settings → Git
- Prisma db push timeout → our build script now logs and continues (since `9abc26a`)
- Missing env var → add, redeploy

### Rollback

Vercel → Deployments → find the last known-good deployment → ⋯ → **Promote to Production**. Single click. No code change required. Rehearse this at least once so you know the UI before you need it under pressure.

## Upgrading from beta tier to live

When you're ready to charge real money:

1. `GRID_BETA_TIER=live` in prod env
2. `STRIPE_SECRET_KEY` swap from `sk_test_*` to `sk_live_*`
3. `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID` point at live prices
4. Set `STRIPE_BETA_TRIAL_DAYS` to your chosen live-tier trial length
5. `POLICY_VERSION` bump in `lib/consent/log.ts` — triggers re-consent
6. Redeploy
7. Test a real charge → refund it
8. Announce via `/changelog`

Our built-in guardrails refuse `sk_live_*` outside the `live` tier, so
you can't accidentally charge a user while still in beta.

## Emergency playbook

See `docs/INCIDENT_RESPONSE.md`. Short version:

1. Suspected breach → declare in writing within 15 min
2. Contain (revoke sessions, rotate keys if needed)
3. Assess scope (how many users, what data)
4. GDPR 72h clock starts at discovery
5. Fix + deploy within severity SLA
6. Post-incident review within 7 days of closure

Don't improvise — the runbook exists so you don't have to think
under pressure.

## Who you can ask for help

- **Vercel** — help@vercel.com (Hobby = community Discord; Pro = business hours)
- **Stripe** — support@stripe.com (24/7 for live accounts)
- **Anthropic** — support@anthropic.com (business hours)
- **Resend** — support@resend.com
- **DB provider** — provider-specific
- **Legal / privacy counsel** — retain one before the first EU user

Escalate to email for anything that might touch user data. Don't use
chat tools where the transcript isn't archived.

## The one rule that matters

**Never rotate `GRID_ENCRYPTION_KEY` without first re-encrypting
every row that depends on it.** You will make every BYOK key
unreadable and lock every tenant out of Nova.

If you need to rotate (compromise suspected), plan a maintenance
window, write a re-encryption migration, test against a DB snapshot,
then run. Never a surprise rotation.
