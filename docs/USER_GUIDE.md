# GRID — User Guide

> Written as a first-time user walking through the product. Every
> feature explained, every friction point named, every click counted.
> This is the reference new testers get pointed at.

## Table of contents

1. [What GRID is, in one paragraph](#what-grid-is)
2. [Before you sign up](#before-you-sign-up)
3. [Signing up](#signing-up)
4. [Onboarding — the 4-step wizard](#onboarding)
5. [Your first dashboard](#your-first-dashboard)
6. [The navigation](#the-navigation)
7. [Building your first system](#building-your-first-system)
8. [The scaffold shortcut — one prompt, whole cell](#the-scaffold-shortcut)
9. [Running your first workflow](#running-your-first-workflow)
10. [Connecting an integration](#connecting-an-integration)
11. [The inbox — your attention filter](#the-inbox)
12. [The calendar — immersive and keyboard-friendly](#the-calendar)
13. [Tasks — the classic view](#tasks)
14. [Goals and health](#goals-and-health)
15. [Nova — the AI layer, everywhere](#nova)
16. [Per-system agents](#per-system-agents)
17. [Settings — the operator console](#settings)
18. [Managing your data (export, delete)](#managing-your-data)
19. [When things break](#when-things-break)
20. [Reference — keyboard shortcuts](#keyboard-shortcuts)

---

## What GRID is

GRID is an operations layer that treats your business as a set of
**interconnected systems**, not a stack of disconnected SaaS tools. You
describe a system (Marketing, Operations, Content Ops), define what
it does as workflows, plug in external integrations that feed signals
into an inbox, and Nova — your workspace's AI — helps you run the
whole thing with growing context of how you actually work.

The mental model: **environment → systems → workflows → stages**.
Everything else (tasks, goals, signals, widgets, agents) nests inside
that hierarchy.

---

## Before you sign up

You'll need:

- An email address (any provider)
- An **Anthropic API key** — see the [FAQ](#faq) for why this is BYOK.
  Get one at https://console.anthropic.com/settings/keys. You can
  skip this at sign-up and add it later.
- Optionally: OAuth tokens from services you use (Google, Notion,
  Slack, etc.). These are added inside the product, not at sign-up.

**Time to first working workspace: 3-5 minutes.**

---

## Signing up

Visit https://grddd.com. The landing page explains the product;
scroll to the waitlist or hit **Get early access** in the top-right
to open `/sign-up`.

### The form

- **Name** — how you want to be addressed in-app
- **Work email** — used for sign-in and notifications
- **Password** — minimum 12 characters; a strength meter appears as you type
- **ToS + Privacy checkbox** — required (GDPR Art. 7)
- **Marketing email checkbox** — optional, default off

Click **Create workspace**. You're now signed in and redirected to
`/welcome`.

> **Privacy note:** your email is stored hashed (for lookups) and
> encrypted at rest. Your password is bcrypt-hashed. We never store
> either in plaintext.

---

## Onboarding — the 4-step wizard

At `/welcome`, a 4-step dots progress bar appears at the top.

### Step 1 — Your name

Pre-filled from sign-up. "What do you do?" is optional but helps
Nova tailor suggestions. Hit **Continue**.

### Step 2 — Name your workspace

This becomes your first **Environment**. "Acme", "Studio Nine",
"Personal" — whatever fits. Hit **Continue**.

### Step 2.5 — How would you like to start?

Two paths:

- **Start fresh** — create a workspace from scratch; proceeds to Step 3
- **Bring your work** — import from Notion / Asana / Monday / CSV.
  Takes you to the Import Wizard. You can still come back and do
  Step 3 / 4 after.

### Step 3 — Brand voice (skippable)

Three short fields: tone, audience, values. Nova uses these when it
generates content on your behalf. **Skip for now** is safe and clearly
marked — you can always set these later in Settings.

### Step 4 — Pick a starting point

Three templates, each with a **preview of what gets created**:

- **Solo builder** — 3 systems (Marketing, Operations, Product), 3 draft workflows
- **Small team** — 5 systems covering a full org
- **Start blank** — nothing pre-created

Pick one. Click **Enter GRID**. You land on `/dashboard`.

---

## Your first dashboard

What you see depends on whether your workspace has data yet.

### If empty

- A "Getting Started" card with 3 numbered steps: Create a system → Connect an integration → Run a workflow
- Below that: a **Scaffold** widget with a text area — "Describe your team. Nova builds the cell."
- An "Or skip ahead" divider pointing at the scaffold shortcut

### If populated

- A greeting ("Good morning / afternoon / evening")
- A status bar: "All systems stable" or "N drift alert(s)"
- **Value meter widget** — "You saved X hours this week"
- 4 stat cards: Overall Health, Automations Running, Tasks Completed, Needs Attention
- Your systems with health scores
- Recent work / AI activity tabs
- Cross-Domain Insights if any

### If mid-way

- "Complete your setup" banner tells you what's missing by name
- Everything else appears as it becomes relevant

The dashboard auto-hides features that have no data yet — it scales
from empty to complex without the empty-state clutter.

---

## The navigation

The left sidebar (visible on ≥md breakpoints; hamburger menu on mobile)
is organized **by your mental model of your business**, not by
feature type:

**Top pinned**
- Home — the dashboard
- Nova — the AI chat surface

**YOUR SYSTEMS**
- Auto-populated from your Environment. Click a system to see its
  workflows, tasks, signals, goals, and agent (if configured).

**WORK**
- Tasks, Inbox, Goals, Calendar

**EXPLORE** (collapsed by default)
- Workflows, Integrations, Documents, Templates, Mastery

**MORE** (collapsed by default)
- Finance, Time Tracking, Forms, Views, Approvals, Assets, Agents, Automations, Dashboards, Environments

**INTELLIGENCE** (collapsed by default)
- Analytics, Reports, Audit, Activity

Collapsed sections persist per-user in localStorage. Open any one and
it stays open.

---

## Building your first system

A **system** is the organizing unit of work in GRID. Think "Marketing"
or "Client Onboarding" or "Content Production" — a functional area
with its own workflows, tasks, goals, and health.

### To create one manually

1. Click **+ New system** under YOUR SYSTEMS in the sidebar (or visit `/systems`)
2. Give it a name and optional description
3. Pick a color (for visual differentiation)
4. Click **Create system**

You land on the system detail page. From here you can:

- Create workflows inside it
- Assign a per-system agent (a scoped Nova persona)
- Set its autonomy tier
- Track its health score
- Attach goals

---

## The scaffold shortcut

If you want to describe your business in a sentence and have Nova
draft the whole thing — systems, workflows, widget layout, role
suggestions, integrations, per-system agents — use the **LiveScaffoldWidget**
on the dashboard (visible only on empty or near-empty workspaces).

1. Type a sentence: *"6-person creative studio doing brand identity + packaging. Marco runs content, Lea runs production ops."*
2. Click **Build this cell →**
3. Watch the organelles stream in live: systems → workflows → signals → widgets → roles → integrations
4. Review the summary: "3 systems · 5 workflows · 2 signals · 4 widgets · 2 roles · 3 integrations"
5. If Nova's self-iteration ran, you'll see whether it applied a revision or kept the original
6. Click **Commit scaffold** to write everything to your workspace in one transaction, or **Reject** to throw it away

Cost: about $0.12 on your Anthropic BYOK key for a standard scaffold;
$0.20 with the critic pass on. Always free on GRID's side.

---

## Running your first workflow

Go into any system (click it in the sidebar). You'll see its workflows
section. Each workflow has a status (DRAFT / ACTIVE / PAUSED) and a list
of stages.

### To run a workflow

1. Click the workflow name — you land on `/workflows/[id]`
2. Look at the stages. Each is a single Nova call with its own prompt.
3. Click **▶ Run** at the top
4. Enter the input (varies by workflow — could be a brief, a URL, a question)
5. Watch the stages execute. Stages that don't depend on each other run in parallel
6. When complete, you see the final output + per-stage cost + a trace

### Reviewing the run

Every execution produces an `Execution` row. You can:
- **Review** it with a 1-5 star rating and free-text notes — Nova uses this for its learning loop
- **Attribute** credit to specific stages
- **Checkpoint** — pause a run mid-stage for human approval (see autonomy tiers)

The review → Mastery Insight loop is what makes Nova get better at
your workflows over time. Don't skip it for the first few runs.

---

## Connecting an integration

Visit `/integrations`. The page is tiered:

### Three layers of readiness

- **Connected** — you've already authenticated, token stored
- **Ready to connect** — env vars present, clicking opens OAuth
- **Setup required** — env vars missing; the operator needs to configure first

### To connect one (e.g. Notion)

1. Find Notion in the list
2. Click the row
3. A modal opens — click **Connect with Notion**
4. You're redirected to Notion; pick which pages/databases GRID can access
5. Approve; you're redirected back. The row now shows **Active** with a masked token preview

### Capability tiers

Each connected integration shows a tier badge:

- **Live sync** — data pulls in every 15 min (Notion, Slack, Google Calendar, HubSpot)
- **Import** — one-time pull at onboarding (Asana, Monday, CSV)
- **Webhook push** — provider pushes events in (Slack events, Stripe webhooks)
- **Connect only** — token stored; no automatic data flow yet, but Nova can use it from a workflow

Most of the 110 providers are currently **Connect only**. More become **Live sync** every week.

### If an integration breaks

If a token expires or the provider disconnects you, the row shows an error. Click the **Reconnect →** button that appears next to the error — it soft-deletes the broken integration and restarts the OAuth flow.

---

## The inbox

Your signal stream. Incoming:

- Signals from connected integrations (every 15 min)
- Webhook-in events (if provider supports)
- Manually-created signals ("+ New signal")
- Nova-generated alerts ("Notion has gone quiet", "Weekly review due")

### Filters along the top

- **Status**: All / UNREAD / TRIAGED / READ
- **Priority**: All / URGENT / HIGH

### Right sidebar (desktop)

Layer toggles — grouped into **Sources** (Manual, Nova, Workflows, System) and **Synced** (one per connected integration with live counts). Click to toggle. Hidden sources are struck through.

### Actions per signal

Click a signal to expand it. Inside:

- **⚡ Ask Nova to triage** — Nova reads the signal and routes it to a system with reasoning
- **→ Task** — one click converts the signal to a task with provenance preserved (`Task.sourceSignalId`)
- **Open system** — if the signal is attributed to one
- **Mark read** / **Dismiss** — housekeeping

---

## The calendar

Immersive, keyboard-navigable, click-to-add. Located at `/calendar`.

### Layers (right sidebar)

**CALENDARS** (internal) — Tasks, Goals & Milestones, Nova Checkpoints (toggle each)

**SYNCED** — one layer per connected calendar integration (Google Calendar, Outlook)

### Interaction

- **Click an empty day** → quick-add task modal anchored to that day
- **Click an event** → detail drawer slides in from the right
- **Hover empty day** → `+` button appears
- **Arrow keys** → navigate between days
- **Home / End** → jump to first/last of month
- **PageUp / PageDown** → previous / next month
- **Enter / Space** → open drawer (if events) or quick-add (if empty)
- **Esc** → close any overlay
- **Month / Agenda toggle** → at the top

### If an external calendar is failing

A red banner appears at the top with the reason + a Reconnect button.

---

## Tasks

Classic three-view task manager: **List / Table / Board**. Located at `/tasks`.

- Filters: environment, status, priority, search
- Bulk actions: select multiple, change status / priority, delete
- Subtasks: tasks can have children
- Labels: comma-separated tags
- Due dates with "overdue" highlighting
- Assignment to team members
- Source signals: tasks converted from an inbox signal link back

All of this is familiar if you've used Linear, Asana, or Jira.

---

## Goals and health

Every system can have goals with a measurable target, current value, and status (ON_TRACK / AT_RISK / BEHIND / ACHIEVED). Located at `/goals`.

Health scores (0-100) roll up from goal progress + workflow success + signal volume. Visible at the system level and on the dashboard.

---

## Nova

Nova is the AI layer. It's everywhere:

- **Nova chat** at `/nova` — full-screen conversation with all workspace context
- **PersistentNovaBar** — a Nova input is always pinned at the bottom of every page (except `/nova` itself)
- **Nova suggestions** in widgets — "Ask Nova about this", "Triage this signal"

### Nova capability tiles (shown in empty state)

- **Diagnose** — "Which systems need attention?"
- **Summarise** — "Show me a full overview"
- **Find bottlenecks** — "Where are the bottlenecks?"
- **Act** — "Create a weekly retro workflow for Operations"

### Confidence chips

Wherever Nova produces output with a stored confidence score (Mastery Insights, consequence predictions), a colour-coded chip shows the tier: low / moderate / good / high. Hover for context.

### Autonomy badges

Per-system agents and direct Nova invocations show a tier badge (Observe / Suggest / Act / Autonomous / Self-Direct) so you always know what Nova is allowed to do.

---

## Per-system agents

Each system can have its own specialised Nova. Configure at `/systems/[id]/agent`:

- **Persona** — "You run the marketing function for a creative studio that…"
- **Tool allow-list** — which tools this agent can use
- **Autonomy tier** — from Observe (read-only) to Self-Direct (highest)

When a workflow runs inside a system with an agent configured, that agent's persona + tool scope apply for the whole run.

---

## Settings

At `/settings`. Tabs:

### Profile
Your name, email, timezone.

### Team
Invite members, set roles (ADMIN / CONTRIBUTOR / VIEWER). Role names mean:
- **ADMIN** — full write access, can connect integrations, manage billing
- **CONTRIBUTOR** — create/edit systems, workflows, tasks
- **VIEWER** — read-only

### API Keys
- **Anthropic key** at `/settings/ai` — paste your sk-ant-... key, we validate it with a 1-token ping, then AES-256-GCM encrypt at rest. Preview `sk-ant-...XXXX` is the only plaintext the UI ever shows.
- **GRID API keys** for programmatic access — each has a scope + revocation button

### Preferences
- Theme (dark / light / auto)
- Timezone
- Reduced-motion preference (respects OS setting by default)

### Billing
- Current plan
- Stripe customer portal link (update card, see invoices)
- Your per-workspace Anthropic usage (we don't meter this — your Anthropic dashboard does)

### AI Autonomy
Global default autonomy tier for new agents. Per-system settings override this.

---

## Managing your data

GRID respects GDPR Article 15 (right of access), 17 (right to erasure), and 20 (right to portability).

### To export all your data
Hit `GET /api/account/export` while signed in. You'll download a JSON file with every environment, system, workflow, signal, goal, task, execution, mastery insight, membership, and integration you own. Credentials (Anthropic key, OAuth tokens) are excluded — you reconnect at the destination.

### To delete your account
Hit `POST /api/account/delete` with `{ "confirm": "DELETE <your-email>" }` in the body. Everything you own cascades: systems, workflows, signals, executions, memberships, sessions. There is no undelete.

### To change your consent
Your sign-up consent is locked in an append-only log. If you want to withdraw marketing consent, update via `/settings/preferences` — a new `ConsentLog` row with `granted=false` is written. We never modify the original.

---

## When things break

See `docs/TROUBLESHOOTING.md` for the full list. Top cases:

| Symptom | First fix |
|---|---|
| Nova says "Connect your Anthropic account to activate Nova" | Paste your key at `/settings/ai` |
| Integration shows "fetch failed" banner | Click **Reconnect →** inline |
| Password reset email never arrived | Check spam; if still missing, visit `/help` |
| Calendar shows no events despite connecting Google | Reconnect from the integrations page — token may have expired |
| Can't see `/admin` | That route is gated to the operator's email — it's not for you |

---

## Keyboard shortcuts

Global:

- `⌘K` / `Ctrl+K` — open command palette
- `⌘/` — open shortcuts cheat sheet
- `Esc` — close any modal / drawer / popover

Calendar:

- `←` `→` — move day focus horizontally
- `↑` `↓` — move day focus vertically (7 days)
- `Home` / `End` — first / last day of month
- `PageUp` / `PageDown` — previous / next month
- `Enter` / `Space` — open event details or quick-add

Inbox:

- `j` / `k` — next / previous signal
- `t` — triage with Nova (selected signal)
- `e` — expand / collapse (selected signal)
- `d` — dismiss (selected signal)

---

## Getting help

- **In-app**: click the Nova bar at the bottom-right and ask. Nova has full workspace context.
- **Docs**: `/help` (or this file on GitHub)
- **FAQ**: `docs/FAQ.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Security issue**: email security@grid.systems (see `/security`)
- **Something else**: email support@grid.systems

We typically respond within 24 hours Mon-Fri.
