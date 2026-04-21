# Phase 5 — System pages become the product

**Goal:** `/systems/[id]` is the most important page in Grid. Workflows, Goals, Documents, Tasks all live inside it as tabs.
**Duration:** Week 3.
**Reversibility:** Low. Once Workflows-as-tab ships, restoring `/workflows` as a global page is regression.

---

## The current failure

`/systems` is a thin index ([app/systems/page.tsx](app/systems/page.tsx)). `/systems/[id]` exists but is not the gravitational center. Workflows, Goals, etc., are global routes that say "create a System first" — they're orphaned features pointing at the thing that should contain them.

This is the structural fix that makes the Systems-first thesis *visible* in the navigation, not just in the data model.

---

## The new System page shape

```
─────────────────────────────────────────────────────────────
  [icon] Inbox Triage                            Health: 87%
  Triage and draft replies for nicole@                     ▾

  [ Manual ] [ Suggest ] [• Auto-with-approval •] [ Auto ]
  ↑ Autonomy slider — visible, tactile, explained on hover
─────────────────────────────────────────────────────────────
  Overview │ Workflows │ Tasks │ Goals │ Documents │ Activity │ Settings
─────────────────────────────────────────────────────────────

  [ Tab content fills remaining viewport ]

─────────────────────────────────────────────────────────────
  [ Nova bar — scoped to this System (Phase 4 context) ]
─────────────────────────────────────────────────────────────
```

Every System tab is a *facet* of the System. Nothing here is a global feature.

---

## Tab specs

### Overview (default)
- Health score with the explainer (Phase 6 — `SystemHealthExplain` component).
- Recent runs (last 10 Nova actions in this System).
- Quick stats: throughput, success rate, $/action — *only if* there's data (else hidden).
- Pinned workflow shortcuts.

### Workflows
- The workflow list + builder for **this System only**.
- Replaces the global `/workflows` page entirely.
- Each workflow shows: stages, last 10 runs sparkline, autonomy mode, edit button.
- "+ New workflow" creates inside this System.

### Tasks
- Tasks scoped to this System.
- Same list/board/table views as global `/tasks` — but filtered.
- Global `/tasks` still exists as cross-System view.

### Goals
- Replaces global `/goals` page.
- Goals are System-scoped by definition (a goal without a system has no operational meaning).
- Empty state: "Set what success looks like for Inbox Triage." Not generic.

### Documents
- Files + Nova-generated artifacts produced by this System (drafts, reports, summaries).
- Becomes useful naturally as workflows produce output.

### Activity
- Every Nova action in this System, ever.
- Filter by: stage, outcome (approved / edited / rejected / auto), date.
- Each row shows the decision-loop chip vocabulary (Phase 6).
- Export to CSV for compliance.

### Settings
- System name, description, icon, color.
- Autonomy defaults (per-stage overrides).
- Integration scoping: which integrations this System can read/write.
- Delete System (with confirmation).

---

## Files to add / move

### New
- `app/systems/[id]/layout.tsx` — header (name, health, autonomy slider) + tab nav. All tabs share this.
- `app/systems/[id]/page.tsx` — Overview tab content.
- `app/systems/[id]/workflows/page.tsx` — moved from `/workflows`, scoped.
- `app/systems/[id]/tasks/page.tsx` — moved from `/tasks` filter, scoped.
- `app/systems/[id]/goals/page.tsx` — moved from `/goals`, scoped.
- `app/systems/[id]/documents/page.tsx` — new.
- `app/systems/[id]/activity/page.tsx` — new (the trust surface; Phase 6 will deepen it).
- `app/systems/[id]/settings/page.tsx` — new.

### New components
- `components/systems/SystemHeader.tsx` — name, health, slider.
- `components/systems/AutonomySlider.tsx` — Manual / Suggest / Auto-with-approval / Auto.
- `components/systems/SystemTabs.tsx` — tab nav.

### Move / refactor
- [app/workflows/page.tsx](app/workflows/page.tsx) — split: builder UI moves to `app/systems/[id]/workflows/`. Global `/workflows` route removed (Phase 1 unlinked it; Phase 5 deletes it).
- [app/goals/page.tsx](app/goals/page.tsx) — same: contents move to System tab; global route removed.

### Touch
- `app/systems/page.tsx` — keep as the index/landing. Becomes simpler: list of Systems with health + new System button. Quick-add templates stay.

---

## The autonomy slider (the most important new affordance)

Four positions, per System (with per-stage overrides in Settings tab):

| Mode | Behavior |
|---|---|
| Manual | Nova suggests, never acts. User does everything. |
| Suggest | Nova prepares actions; user approves each. (Default for new Systems.) |
| Auto-with-approval | Nova acts on low-risk; queues high-risk for approval. |
| Auto | Nova acts on everything; user reviews after-the-fact in Activity. |

- Tactile: pill slider, slight haptic-style click on change.
- Explained on hover: each mode shows what changes ("Auto: drafts are sent without your review").
- Per-System, not global. Inbox Triage might be Auto; Client Onboarding might be Manual.
- Persisted on the System model. Likely a field on `system.config` or a new `autonomyMode` enum.

---

## Acceptance criteria

- [ ] Global `/workflows`, `/goals` routes return 404 or redirect to `/systems`.
- [ ] Every System tab loads in <500ms after the layout is cached.
- [ ] Autonomy slider change persists immediately, reflects in next Nova action.
- [ ] Activity tab shows every Nova action with: stage, decision, confidence, outcome, undo (if applicable).
- [ ] Settings → Integration scoping actually restricts what Nova can do in this System.

---

## What you DO NOT do

- Do not let Workflows return as a global page. Cross-System workflow view is a Phase-6+ luxury.
- Do not show all 7 tabs to a brand-new System. Hide Documents and Goals until first content. Keep visible: Overview, Workflows, Tasks, Activity, Settings.
- Do not let users create a Workflow without a System. The dependency is the thesis.
- Do not duplicate the Nova bar inside the System page. The persistent bar (Phase 4) handles it; just register `useNovaContext({ surface: 'system', id })`.

---

## Risks

1. **Tab proliferation pressure.** Every cut feature will want to come back as a tab. Hold the line: 7 tabs maximum, ever. New facets earn their slot by killing an old one.
2. **Per-System autonomy is a permissions surface.** Audit it carefully — a user setting "Auto" on a System with Stripe integration can move money. Phase 6's trust surface MUST ship before any "Auto" mode is enabled in production.
3. **Migration of existing workflows/goals.** They already have `systemId` foreign keys (per Prisma schema). The data is fine; only the routing changes.
4. **Deep links break.** Anyone bookmarking `/workflows/abc` is now broken. Add a redirect: `/workflows/[id]` → `/systems/[systemId]/workflows/[id]` based on the workflow's systemId.

---

## Done when

A user can do everything they did in the old global Workflows/Goals/Tasks pages — but now from inside the System the work belongs to. The sidebar never needs Workflows or Goals as items, because the System page is where work happens.

The screen recording of "open System → see Overview → switch to Workflows tab → edit a stage → ask Nova to improve it via the bar → approve via the chip" should be the demo you show investors. That's the thesis, made visible.
