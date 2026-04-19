# Changelog

Human-readable log of what shipped, why, and when. Append new entries
at the top. Every entry should tell a user what changed in their
experience, not what lines of code moved.

The /changelog page reads this file at build time.

---

## 2026-04-19 — Compliance, deployment hardening, and user-facing primitives

Public-approval readiness pass. Focus: every user action now produces
a provable audit trail, every failure is visible, every widget closes
a decision loop.

### New

- **Consent log** — GDPR Article 7 provable consent. Sign-up now requires
  an affirmative checkbox for Terms + Privacy; marketing consent is
  strictly opt-in and logged separately. Every change is appended to
  an immutable `ConsentLog` table.
- **Subprocessors page** at `/subprocessors` — GDPR Article 28 transparency.
  Lists every third-party processor, what data they see, where they're
  hosted, and a link to each DPA.
- **Security policy** at `/security` + `/.well-known/security.txt` —
  Responsible disclosure process, in-scope and out-of-scope targets,
  response SLAs.
- **Admin dashboard** at `/admin` — gated by `GRID_ADMIN_EMAIL`. One
  surface showing AppError volume, recent sync failures, per-integration
  activity, user + environment counts, and migration status.
- **Load test harness** — `npm run test:load` runs a k6 smoke profile
  against a local or staging URL with realistic endpoints.

### Improved

- **Integrations page** — "Setup required" badge on providers missing
  env vars; top-of-page banner when any need operator setup; inline
  Reconnect button on failure; docs/INTEGRATIONS_SETUP.md gets a
  quick-reference table mapping every OAuth provider to where to
  register.
- **Calendar** — immersive click-to-add, event detail drawer, full
  keyboard navigation (arrows, Enter, Esc), Month/Agenda toggle,
  WAI-ARIA grid, respects `prefers-reduced-motion`.
- **Inbox** — layer sidebar matching /calendar, per-integration source
  toggles with live counts, `→ Task` one-click conversion on any
  signal (provenance via `Task.sourceSignalId`).
- **Widgets** — new `actions` contract: every widget can declare up to
  3 one-click intents rendered in a footer row. AttentionWidget is
  the first instrumented surface.
- **Silent-sync detector** — Nova now alerts you in your inbox when
  an integration goes silent. Compares current activity to a 7-day
  rolling baseline; escalates HIGH priority when a high-volume
  provider goes dark.

### Fixed

- **Build pipeline** — the build-time `prisma db push` step no longer
  halts the entire deploy on a DB hiccup. Schema drift is logged
  prominently and the application code still deploys.
- **Google Calendar silent failure** — calendar-page banner now shows
  exactly why an external fetch failed, with a one-click Reconnect.
- **Email silent-drop** — when `RESEND_API_KEY` is unset, password
  reset used to succeed (for enumeration safety) while the email
  never sent. Failures now log to `AppError` so ops sees the backlog.

### Security

- SSRF hardening on webhook delivery + every integration fetch
- Cross-tenant isolation on `CrossDomainInsight` (was globally readable)
- BYOK bypass fixed in workflow kernel (was using platform key)
- Stripe live keys refused outside the `live` tier
- Right-to-erasure (`POST /api/account/delete`) and data portability
  (`GET /api/account/export`) both implemented

---

## 2026-04-18 — Cellular scaffold MVP

### New

- **One-prompt environment scaffolding** — describe your team in a
  sentence, Nova drafts systems + workflows + widget layout + per-system
  agents. Review-before-commit so nothing writes to your DB until you
  accept.
- **Per-system agent pool** — each system can have its own Nova persona
  with a tool allowlist and autonomy tier (Observe → Self-Direct).
- **Parent/child environments** — brand DNA inherits down the tree so
  multi-brand operators can share one nucleus across client workspaces.
- **Confidence chips + autonomy badges** — every Nova output shows
  its own confidence score; every agent surface shows its autonomy
  tier visibly.

### Improved

- **Workflow execution** — stages that don't depend on each other now
  run in parallel (wavefront executor). A diamond DAG runs in depth
  ticks instead of length ticks.
- **Scaffold feedback loop** — every accept/edit/reject is persisted
  as a MasteryInsight; the next scaffold for the same env gets
  shaped by those corrections.

### Security

- Tenant isolation guards on every `/api/*/[id]` route — 48 unit tests
  lock the guard shape
- AES-256-GCM encryption at rest for BYOK Anthropic keys
- Rate limiting on every mutation endpoint
- CSP, HSTS, frame-ancestors, `prefers-reduced-motion`, and full WCAG
  2.1 AA audit pass

---

## 2026-04-17 — Integration sync goes real

Before this, 110 providers could OAuth-connect and the sync endpoint
was a stub that wrote one fake "sync triggered" signal. Now:

- **Real fetchers** for Notion, Slack, Google Calendar, HubSpot
- **Scheduled sync** every 15 minutes via Vercel Cron
- **Capability tiers** on the integrations page so users know which
  providers flow data continuously vs. store a token only
