# Phase 3 — Dashboard as cockpit, not theatre

**Goal:** `/dashboard` answers exactly one question: *"What did Nova do, and what needs me?"*
**Duration:** Week 2.
**Reversibility:** High. This is a single-page rewrite.

---

## The current failure

Today's dashboard ([app/dashboard/page.tsx](app/dashboard/page.tsx)) shows: 4 zero-stat cards, an empty Systems section, "Recent Work / AI Activity" empty tabs, jump-to links to features that don't work yet. UX audit: 4/10.

The page has no point of view. It tries to be a homepage, a metrics view, a navigation hub, and an empty-state guide simultaneously.

---

## Three modes, gated by data state

The dashboard is one component that renders three layouts based on workspace state.

### Mode A — Zero state (no Systems, or onboarding bypassed)
Should be unreachable after Phase 2 onboarding. Defensive layout for edge cases (existing users mid-migration, intentional skip).

```
[ Full-bleed Nova prompt: "What do you want Grid to run for you?" ]

[ 3 wedge cards — same as onboarding step 1 ]

[ Subtle link: "Skip — explore an empty workspace" ]
```

No stats. No jump links. No empty Recent Activity. The page is a re-entry to onboarding.

### Mode B — Activated (1+ Systems, workspace age <7 days)
The "first week" view. Optimized for *trust building*, not metrics.

```
[ Greeting + autonomy summary ]
"Good morning, Nicole. Nova ran 12 actions overnight. 3 need your review."

[ TODAY — feed of approval queue, drafts, suggestions ]
- Inbox Triage · 3 drafts ready for review
- Calendar Defense · proposed declining "Sync re: Q2"
- Inbox Triage · auto-archived 47 newsletters (undo)

[ YOUR SYSTEMS — small grid, max 4 visible ]
Each card: name, health %, last Nova action, autonomy mode

[ Persistent Nova bar at bottom (Phase 4) ]
```

No stat cards. The feed IS the value. Every item is actionable inline.

### Mode C — Mature (1+ Systems, workspace age ≥7 days, ≥50 Nova actions logged)
Stats become meaningful because there's history.

```
[ Greeting + cumulative summary ]
"Nova ran 247 actions this week — 89% auto-approved, 11% needed you."

[ TODAY feed (same as Mode B) ]

[ HEALTH STRIP — small inline charts per System: 7-day throughput, success rate, $/action ]

[ YOUR SYSTEMS grid (full) ]

[ Decision-loop drill-in link: "See all autonomy decisions →" ]
```

This is the only mode where the original stat-card energy belongs — and only because it's now backed by data.

---

## Mode-switch logic (the gate)

```ts
function dashboardMode(workspace) {
  if (workspace.systems.length === 0) return 'A';
  const ageDays = daysSince(workspace.createdAt);
  const actionCount = workspace.novaActionCount;
  if (ageDays < 7 || actionCount < 50) return 'B';
  return 'C';
}
```

Promote demotion: if a user deletes all Systems, drop back to Mode A. If activity dies for 30+ days, surface a re-engagement variant of Mode B (don't pretend they're a power user).

---

## Files to edit

### Replace
- [app/dashboard/page.tsx](app/dashboard/page.tsx) — full rewrite. Three sub-components, one mode-selector parent.

### New
- `components/dashboard/ModeA_ZeroState.tsx`
- `components/dashboard/ModeB_FirstWeek.tsx`
- `components/dashboard/ModeC_Mature.tsx`
- `components/dashboard/ApprovalFeed.tsx` — the TODAY feed; reused in Modes B and C
- `components/dashboard/SystemCard.tsx` — small card; reused in Modes B and C
- `lib/dashboard/mode.ts` — the gate function above

### Delete
- The "Jump To" section (Inbox / Reports / Analytics / Audit log links). Not needed; sidebar covers it.
- The "Recent Work / AI Activity" empty tabs.
- The 4 stat cards in their current form. Stats return only inside Mode C's HEALTH STRIP.

---

## The TODAY feed — the most important component

This is the workhorse of Modes B and C. Every item:
- Has a clear noun ("Inbox Triage")
- Names a specific Nova action ("3 drafts ready")
- Is actionable inline: Approve / Edit / Reject / Undo / View
- Shows confidence + reasoning on hover (Phase 6 vocabulary)
- Disappears once handled

Sort: by recency, with a "needs review" cluster pinned to top.
Limit: 20 items visible, "show more" below.
Empty state: "Nova has nothing waiting. You're caught up."

---

## Acceptance criteria

- [ ] Mode A is unreachable from normal onboarding (verify with new-user test).
- [ ] Mode B shows zero numeric stat cards.
- [ ] TODAY feed actions complete inline without navigation.
- [ ] Mode switches are testable in isolation (component receives `mode` prop).
- [ ] Mode C is gated; cannot be reached by a user with 5 Nova actions.

---

## What you DO NOT do

- Do not ship Mode C in week 2. You probably have no users with 50 actions yet. Ship Modes A + B only. Stub C behind a feature flag.
- Do not add charts in Mode B. Charts of week-1 data are noise.
- Do not preserve the "Good evening / 1 online / All systems stable" cluster verbatim — those badges fed the theatre problem. Keep the greeting, drop the status badges.

---

## Done when

Open the dashboard with zero data → see Mode A re-entry to onboarding.
Open the dashboard after onboarding completes → see Mode B with real items in the TODAY feed.
The page never shows "0" or "—" anywhere.
