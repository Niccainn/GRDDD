# GRID UX Audit — First-Run Experience & Structural Analysis

**Date:** 2026-04-17  
**Method:** Full click-through from sign-up to dashboard, navigation of all primary routes  
**Perspective:** New user (founder persona), no prior context

---

## What Grid Is Supposed to Be

Grid positions itself as an **AI operations layer** — not another task tool, but the substrate that connects how a business actually runs. The hierarchy:

```
Environment (workspace/client)
  └── System (business function: Marketing, Operations, Sales)
       └── Workflow (automated multi-stage AI pipeline)
            └── Stage (single AI execution step)
       └── Tasks (manual work items)
       └── Goals (measurable outcomes)
```

Nova (the AI) sits across all of this — it can read/write to any system, run workflows, update health scores, and learn patterns over time. The user is meant to *see their business as an interconnected operating system* and use AI to run it.

---

## Click-Through Documentation

### 1. Sign-Up (`/sign-up`)

| Element | Observation |
|---------|-------------|
| Layout | Centered glass card, dark bg, GRID logo above |
| Fields | Name, Work email, Password (with strength meter) |
| CTA | "Create workspace" — green, full-width |
| OAuth | "OR" divider visible but no OAuth buttons rendered (closed alpha) |
| Footer | "Already have an account? Sign in" + Terms/Privacy links |

**UX Score: 7/10**  
Clean, fast, no friction. Password strength meter is a nice touch. Missing: no indication of what you're signing up *for* — no feature preview, no social proof. The "OR" divider with nothing above it is confusing.

---

### 2. Onboarding (`/welcome`) — 4 Steps

**Step 1: Your Name**
- Pre-filled from sign-up
- Optional "What do you do?" field
- Progress bar: 4 green segments

**Step 2: Name Your Workspace**
- Single field, placeholder "Acme, Studio Nine, etc."
- Subtitle: "This is the name of your private instance of GRID"

**Step 3: Brand Voice** (skippable)
- Three fields: Tone, Audience, Values
- "Nova will stay on-brand in everything it creates"
- Smart to make this optional — reduces friction

**Step 4: Pick a Starting Point**
- Solo builder / Small team / Start blank
- Each with icon + 1-line description
- "Enter GRID" CTA

**UX Score: 6/10**

Problems:
- **Sidebar is visible during onboarding.** The full app navigation (Tasks, Inbox, Goals, Calendar, Documents, Forms, Views, Finance, Time Tracking, Approvals, Assets, Environments, Settings) shows behind the modal. This is overwhelming — the user hasn't finished setup but can already see 15+ nav items they don't understand.
- **No context for "System" vs "Environment" vs "Workspace."** The wizard creates a workspace but never explains what a System is — yet workflows and goals depend on systems. The user enters Grid with no mental model.
- **Brand voice step is well-placed but feels disconnected.** Why am I defining brand voice before I've even seen the product? The value isn't clear yet.
- **Template selection is too vague.** "Solo builder: Starter systems for capture, triage, and weekly review" — what does that mean? No preview of what gets created.

---

### 3. Dashboard (`/dashboard`)

| Zone | Content |
|------|---------|
| Header | "Good evening" greeting, "1 online", "All systems stable" badge |
| Nova banner | "Your workspace is ready" with 3 suggested actions |
| Setup prompt | "Complete your setup" with Continue link |
| Nova input | "What would you like to work on?" prompt bar |
| Stats row | 4 cards: Overall Health (—), Automations Running (0), Tasks Completed (0), Needs Attention (0) |
| Systems | "No systems yet — Create one →" |
| Recent Work / AI Activity tabs | Empty |
| Jump To | Inbox, Reports, Analytics, Audit log |
| Recent Activity | "No recent activity" |

**UX Score: 4/10**

**Critical Problems:**

1. **Empty state paralysis.** A new user sees 4 stat cards all showing 0/—, empty systems, empty activity. There's no guidance on *what to do first*. The three Nova suggestion pills ("What can you do for me?", "Draft something on-brand", "Set up my first automation") are buried under a dismissible banner.

2. **No clear hierarchy of action.** The dashboard presents: a Nova prompt bar, a setup continuation banner, 4 stat cards, a systems section, jump links, and activity — all at equal visual weight. Nothing says "START HERE."

3. **"Complete your setup" is vague.** What setup? The onboarding wizard finished. What's left? Clicking "Continue" doesn't explain.

4. **Stats are meaningless at zero.** Showing "Overall Health: —" and "Automations Running: 0" to a new user communicates nothing. These cards should be hidden or replaced with getting-started prompts until there's data.

5. **The jump-to section (Inbox, Reports, Analytics, Audit log) is exposed too early.** A new user has no data in any of these. This is feature furniture — it looks like a product but doesn't function as one.

---

### 4. Navigation Sidebar

**Structure observed:**

```
GRID logo
Search (⌘K)

Home
Nova

WORK
  Tasks
  Inbox
  Goals
  Calendar
  Documents
  Forms
  Views

OPERATIONS
  Finance
  Time Tracking
  Approvals
  Assets

STRUCTURE
  Environments
  (cut off — likely Systems, Workflows, Integrations below fold)

Settings
[User: Nicole, nicole@grid.systems]
```

**UX Score: 3/10**

**Critical Problems:**

1. **17+ nav items visible immediately.** This is the single biggest UX failure. A solo founder sees: Home, Nova, Tasks, Inbox, Goals, Calendar, Documents, Forms, Views, Finance, Time Tracking, Approvals, Assets, Environments, Settings — *before they've created a single task.* This is enterprise software complexity without enterprise context.

2. **Category labels don't match the mental model.** "WORK" contains Tasks, Inbox, Goals, Calendar, Documents, Forms, Views. "OPERATIONS" contains Finance, Time Tracking, Approvals, Assets. "STRUCTURE" contains Environments. But where are **Systems** and **Workflows** — the core of what Grid claims to be? They're hidden below the fold or missing from the sidebar entirely.

3. **Workflows and Systems are buried.** The two features that differentiate Grid from every other tool (the system-level operational view and the AI workflow engine) are not in the sidebar. You reach Workflows through the dashboard's empty "Go to workflows →" link. This is like hiding the search bar in Google.

4. **No progressive disclosure.** All features are visible whether you have data or not. Finance, Time Tracking, Approvals, Assets — these should be hidden until relevant, or gated behind system creation.

5. **Nova has a nav item but no persistent presence.** Nova is Grid's AI layer — the thing that makes it different. But it's just another sidebar link, equal in visual weight to "Forms" and "Assets." The small "N" button in the bottom-left is the only persistent Nova access, and it's easy to miss.

---

### 5. Nova (`/nova`)

| Element | Observation |
|---------|-------------|
| Header | "Nova — AI operations engine · global mode" |
| Suggestion pills | 6 pre-built queries |
| Input | Full-width prompt bar |
| History | "INTERACTION LOG 0 of 0" with search |

**UX Score: 6/10**

The Nova page itself is clean. Good suggestion pills ("Which systems need attention?", "Where are the bottlenecks?"). But it suffers from the empty-workspace problem — none of these queries will return useful results until systems and workflows exist.

**Missing:** No explanation of what Nova *can do*. No examples of real output. No tutorial interaction.

---

### 6. Tasks (`/tasks`)

| Element | Observation |
|---------|-------------|
| Header | "Tasks — 0 active · 0 completed" |
| Views | List / Table / Board toggle |
| Filters | All environments, All statuses, All priorities |
| Empty state | "No tasks yet — Create your first task to get started" |

**UX Score: 7/10**

Tasks is actually well-designed. Clean filter bar, three view modes, clear empty state. This is standard SaaS task management done right. But it raises a question: *why would I use Grid for tasks instead of Asana/Linear/Notion?* Nothing here shows the AI or system integration that differentiates Grid.

---

### 7. Workflows (`/workflows`)

| Element | Observation |
|---------|-------------|
| Header | "Workflows — 0 of 0 workflows" |
| Empty state | "Create a system first — Workflows are automated processes that run inside systems" |
| CTA | "Create a system →" |

**UX Score: 5/10**

The dependency chain is revealed here: you can't create workflows without first creating a system. But the user was never told to create a system. The onboarding wizard for "Solo builder" template should have created starter systems. Instead, the user hits a dead end on what should be Grid's most compelling feature.

---

### 8. Goals (`/goals`)

Same pattern: "Set your first goal — Choose a system to add a goal →". Requires a system first.

**UX Score: 5/10**

---

### 9. Integrations (`/integrations`)

| Element | Observation |
|---------|-------------|
| Header | "Integrations — 0 connected · 110 available" |
| Filters | All 110, Productivity 6, Project Management 9, Communication 5, Calendar 4, CRM 5, Commerce 7, Email Marketing 5, Social Media 5, Advertising 4, Analytics 7 |
| Grid | 3-column cards with icon, name, description |
| Categories | Productivity, Project Management, Communication (visible) |

**UX Score: 8/10**

Best page in the app. Clean grid, clear categories, good search. The 110 integrations with one-click OAuth is genuinely impressive. This is where Grid's value becomes tangible — but it's buried in the nav and not surfaced during onboarding.

---

### 10. Settings (`/settings`)

Tabs: Profile, AI Autonomy
Sub-nav: Profile, Team, API Keys, Preferences, Billing

Clean, standard settings layout. AI Autonomy tab is unique and interesting — but it's hidden in settings instead of being a first-class concept.

**UX Score: 7/10**

---

## Heatmap Analysis — Where Attention Goes vs. Where It Should Go

### Where a new user's eyes go (attention prediction):

```
HIGH HEAT (first 3 seconds):
┌──────────────────────────────────────────────┐
│ ██████ "Good evening"                        │ ← greeting, large text
│ ████████████████████████ Nova banner          │ ← green accent, prominent
│ ████ Setup continuation banner               │ ← green accent
│ ██████████ "What would you like to work on?" │ ← green-bordered input
│ ████ Stats row (0, 0, 0, —)                  │ ← large numbers, green accent
│                                              │
│ LOW HEAT:                                    │
│ ░░ Systems section (empty)                   │
│ ░░ Jump To links                             │
│ ░░ Recent Activity                           │
└──────────────────────────────────────────────┘

SIDEBAR:
██ Home (active)
█ Nova
░ Tasks
░ Inbox
░ Goals
░ Calendar
░ Documents
░ Forms
░ Views
░ Finance (below fold in attention)
░ Time Tracking
░ Approvals
░ Assets
```

### Where attention SHOULD go:

```
1. "Create your first system" → prominent, top-center
2. "Connect an integration" → obvious next step
3. "Run your first workflow" → the aha moment
4. Nova → persistent, ready to help at each step
```

### The Gap:
The dashboard's visual hierarchy puts **display metrics** (stats, health scores, activity feeds) first — but these are all empty. The **action items** (create system, connect integration, run workflow) are scattered across different pages with no guided path. The user sees a dashboard designed for *day 30* when they're on *day 1*.

---

## Organizational Hierarchy Gap

### What Grid Claims:

```
Environment → System → Workflow → Stage
                    → Tasks
                    → Goals
                    → Health Score
```

### What the User Experiences:

```
Sign up → Onboarding (name, workspace, brand voice, template)
       → Dashboard (empty stats, no systems)
       → ??? (no guided path to create a system)
       → Workflow page says "create a system first"
       → Goals page says "choose a system first"
       → Tasks page works but has no AI integration visible
       → Nova page works but has no data to analyze
```

**The core concept of "System" is the load-bearing abstraction** — everything depends on it — but it's never introduced, never explained, and the user has to discover it through dead ends.

---

## Scored Summary

| Area | Score | Weight | Weighted |
|------|-------|--------|----------|
| Sign-up | 7/10 | 0.10 | 0.70 |
| Onboarding | 6/10 | 0.15 | 0.90 |
| Dashboard (empty state) | 4/10 | 0.20 | 0.80 |
| Navigation | 3/10 | 0.20 | 0.60 |
| Nova | 6/10 | 0.10 | 0.60 |
| Core features (Tasks/Workflows/Goals) | 5/10 | 0.15 | 0.75 |
| Integrations | 8/10 | 0.05 | 0.40 |
| Settings | 7/10 | 0.05 | 0.35 |
| **TOTAL** | | | **5.10/10** |

---

## The Meta Problem: Grid Is Organized Like Software, Not Like Operations

Grid's sidebar is organized by **feature type** (Tasks, Documents, Forms, Finance). But Grid's *thesis* is that you should see your business by **operational system** (Marketing, Sales, Content, Operations). The navigation contradicts the product's own philosophy.

**What it should feel like:**

```
[Your Systems]
  Marketing (health: 82%)
    → Workflows, Tasks, Goals, Signals
  Content (health: 91%)
    → Workflows, Tasks, Goals, Signals
  Operations (health: 74%)
    → Workflows, Tasks, Goals, Signals

[Nova] (always visible)
[Inbox] (cross-cutting signals)
```

Instead it feels like:

```
[Feature categories]
  Tasks (across all systems, flattened)
  Workflows (across all systems, flattened)
  Goals (across all systems, flattened)
  Documents, Forms, Finance, Time Tracking...
```

This is the fundamental layout problem. Grid has built a feature-organized SaaS tool but is selling a system-organized operational layer. The navigation needs to lead with **systems** (the user's mental model of their business) and nest features within them — not the other way around.

---

## What Needs to Change for the Metacognitive Thesis

If Grid wants to be the platform that helps users *understand how their business works* (not just run it faster), the layout needs to:

1. **Lead with systems, not features.** The sidebar should show your business functions, not a feature list. Tasks, workflows, goals, and signals live *inside* systems.

2. **Guide the first 5 minutes.** Onboarding should create a system, connect one integration, and run one workflow — in that order. Show the user an "aha" before showing them 17 nav items.

3. **Make Nova the thread, not a page.** Nova should be omnipresent — a persistent input bar, a contextual assistant on every page — not a separate destination you navigate to.

4. **Hide what's empty.** Finance, Time Tracking, Approvals, Assets, Forms, Views — these should appear in the sidebar only after the user has engaged with the core loop (system → workflow → evaluation).

5. **Surface the metacognitive layer.** The mastery widget, attribution panel, and execution checkpoints we built should be *above* the raw data — not buried. The user's learning curve should be the first thing they see after their first reviewed run, not something they have to go find.

The product has depth. The UX doesn't expose it.
