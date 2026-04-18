# Integrations Roadmap

Derived from the capability audit. Single source of truth for "which
providers actually flow data" vs "which only store a token." Ties to
`lib/integrations/capability.ts` — the badge on every integration
card computes its tier from the same lists below.

## Current state

| Tier | Count | Providers |
|---|---|---|
| Live sync | 4 | notion, slack, google_calendar, hubspot |
| Import | 3 | notion, asana, monday |
| Webhook push | 2 | slack, stripe |
| Connect only | ~101 | everything else in the registry |

"Live sync" and "import" overlap on notion (it's in both — sync wins
for badging). So unique providers with real data flow: **~6 of 110**.

## Promotion order — the next 7 sync fetchers

Prioritised by (user pull) × (API surface simplicity) × (impact on
top target verticals). Add one per day; each is ~2-3 hours of work.

### 1. GitHub ⭐ highest leverage
**Why first:** nearly every tech-adjacent user has one. Issues, PRs,
review requests are all "signals" in GRID's model. Well-documented
REST v3 + GraphQL v4 APIs. Token auth is straightforward.

**Items to pull:** new issues + new PRs + review-requests-on-me, all
scoped to the authenticated user's repos.
**Endpoint:** `GET /issues?filter=assigned&since=<ts>` +
`GET /search/issues?q=review-requested:<user>`.

### 2. Linear ⭐
**Why:** product teams use this as their nervous system. Cycle
updates + issue changes are the highest-density signals.
**Endpoint:** GraphQL `viewer.assignedIssues(filter: { updatedAt: { gt: $since } })`.
**Token:** already stored per the OAuth start flow.

### 3. Stripe
**Why:** finance-adjacent signal. Failed payments, new subscriptions,
disputes all need human attention fast.
**Endpoint:** `GET /v1/events?created[gte]=<ts>` with explicit event
type allowlist.
**Nuance:** Stripe events can be high-volume for active merchants —
cap at 100 per tick and dedupe aggressively on `event.id`.

### 4. Figma
**Why:** direct hit for GRID's creative-studio thesis (even though
we haven't committed to the vertical publicly). Comments on files
are a "someone wants input" signal that creative teams currently
miss in Slack noise.
**Endpoint:** `GET /v1/files/:key/comments` (paginated by `created_at`).
**Nuance:** users connect at project scope; iterate over connected
files.

### 5. Shopify
**Why:** ecom operators use this for order/inventory signals.
**Endpoint:** `GET /admin/api/2024-04/orders.json?updated_at_min=<ts>&status=any`.
**Nuance:** domain-scoped endpoint; `accountLabel` stores the shop
domain.

### 6. Google Drive
**Why:** "new shared file" / "new comment on doc" fills the ops-team
triage inbox. Already has the Google OAuth plumbing after today's
scope fix.
**Endpoint:** `GET /drive/v3/changes?pageToken=<cursor>` (use
startPageToken on first fetch, store cursor between ticks).
**Nuance:** stateful — uses a cursor, not a timestamp. Store it on
Integration.accountLabel or add a dedicated column.

### 7. Intercom
**Why:** support teams live here. New conversations + NPS/CSAT
responses are high-urgency.
**Endpoint:** `GET /conversations/search` with `updated_at > since`.
**Token:** API key per workspace.

## Non-blocking pre-work (once, then it accelerates every fetcher)

- **Cursor column on Integration.** Google Drive needs a cursor (not
  a timestamp). Adding `Integration.syncCursor String?` now costs
  one small migration and unblocks cursor-based providers forever.
- **Per-provider sync interval.** Stripe is high-volume; a 15-min
  cron across every provider is wasteful for Figma. Add
  `Integration.syncIntervalMinutes Int?` nullable column; fall back
  to the cron default when null.

## Test pattern for every new fetcher

Copy `__tests__/sync-providers.test.ts` — each fetcher test mocks
global fetch, asserts:

1. The correct endpoint + headers are called
2. The `since` filter is honoured (older items dropped)
3. Cancelled / archived / draft items are skipped
4. Normalised SyncItem shape matches the dispatcher contract

With the pattern in place, each new fetcher + its 4 tests is
roughly 2 hours.

## Capability count source of truth

Never maintain counts in marketing copy. The landing page, the
/integrations page, and any future in-app "you have X connected"
surface all derive from `capabilityCounts(…)` in
`lib/integrations/capability.ts`. When a new fetcher lands, the
dispatcher's `IMPLEMENTED_SYNC_PROVIDERS` set gets one entry, and
every surface updates automatically.
