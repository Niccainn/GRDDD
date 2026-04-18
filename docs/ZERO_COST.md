# Zero-Cost Posture

GRID runs on $0 marginal infrastructure. This is architectural, not
aspirational. Every change to this file requires explicit approval.

## The thesis

Users bring their own Anthropic key (BYOK). Grid's marginal cost per
tenant is the DB row, the hosting CPU cycle, and the bandwidth bytes —
all of which fit inside free tiers up to thousands of users. There is
no compelling reason to adopt a paid SaaS before product-market fit is
proven.

## What we use (all free tier)

| Category         | Service          | Free-tier ceiling              | What would push us over  |
|------------------|------------------|--------------------------------|---------------------------|
| Hosting          | Vercel Hobby     | 100GB bandwidth/month          | ~10K active daily users   |
| Database         | Turso / Neon / Supabase free | 500MB – 3GB            | ~50K tenants with light data |
| Email            | Resend free      | 100 emails/day                 | high-volume sign-ups      |
| LLM              | BYOK (tenant's)  | n/a — user pays                | never — structural        |
| Cron             | Vercel Cron      | 2 crons on Hobby, unlimited Pro| needing >2 schedules      |
| Error tracking   | Self-hosted AppError table in our own Postgres | free forever | Postgres fills up — add retention job |
| Uptime monitoring| UptimeRobot free | 50 monitors, 5-min intervals   | never — free tier covers it |
| Analytics        | Vercel Web Analytics (free tier) | 2,500 events/month    | moving to Plausible/Umami self-hosted |
| OAuth            | Own server-side only | n/a                       | never — we don't pay OAuth fees |

## What we explicitly do NOT use

**Paid error-tracking SaaS (Sentry paid, Datadog, Rollbar)** — replaced
by `lib/observability/errors.ts` writing to our own `AppError` table.
Swappable later if volume demands, but not without approval.

**Paid uptime monitoring (PagerDuty, Better Stack Pro)** — UptimeRobot
free tier covers us, and any tenant who wants their own monitoring
can point their own free-tier tool at `/api/health`.

**Paid APM (New Relic, Datadog APM)** — Vercel's built-in logs + our
own AppError scope tags are enough for the scale we're at.

**Paid search (Algolia, Elastic Cloud)** — Postgres full-text works
for the data sizes we'll see for a long time.

**Paid rate-limit store (Upstash Pro, Redis Cloud)** — Upstash free
tier is configured as a nice-to-have; in-process `lib/rate-limit.ts`
works as the default fallback without it.

**Paid pen-test SaaS (HackerOne Enterprise, Bugcrowd)** — deferred.
When we need external security review we use HackerOne's community
free tier or a one-off consultant engagement that's explicitly scoped
and time-bound.

**Paid Stripe features (Tax, Atlas, Radar paid tiers)** — base Stripe
only. Enough for the capture flow we have during beta.

## The BYOK cost shield

The single most important line: **every LLM call in Grid goes through
the tenant's own Anthropic key**, resolved per-invocation via
`lib/nova/client-factory.ts`. Grid does not pay for a single token of
user-facing LLM output. This is what makes the zero-cost posture
durable rather than a growth cap.

The only exception: the 50K-token trial in `closed` tier, where a new
user can explore before connecting their own key. Capped at ~$15
total across the closed beta cohort.

## If we need to spend money

The order of operations, should zero-cost become untenable:

1. **Domain renewal** — already paid, continues annually
2. **Vercel Pro** — only if we exceed Hobby bandwidth
3. **Postgres paid tier** — only if Turso/Neon free tier fills up
4. **Sentry free tier** — only if AppError table volume exceeds what
   Postgres can retain. Free tier (5K events/mo) buys time before
   any paid plan.
5. **Pen test** — one-off before seed round, not recurring

Anything not on this list needs a written justification and sign-off.
