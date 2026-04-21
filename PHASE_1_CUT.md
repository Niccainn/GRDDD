# Phase 1 — Cut to the bone

**Goal:** Sidebar drops from 17+ items to 6. Every nav item is usable on day 1.
**Duration:** Days 1–3 of week 1.
**Reversibility:** Low. This is the psychological commit. Ship it on a Monday.

---

## The new sidebar (final shape)

```
GRID logo
Search (⌘K)

Home              → /dashboard
Nova              → /nova   (log/history view; agent itself is the persistent bar — Phase 4)

YOUR SYSTEMS      (dynamic — fetched from /api/systems)
  • [System 1]
  • [System 2]
  + New System

Tasks             → /tasks
Inbox             → /inbox
Calendar          → /calendar

Settings          → /settings
[User chip]
```

Six static items + the dynamic Systems list + Settings. That's it.

---

## Files to edit

### `components/Sidebar.tsx` (lines 58–119, 333–384)
- Delete EXPLORE section (Workflows, Integrations, Documents, Templates, Mastery)
- Delete MORE section (Finance, Time, Forms, Views, Approvals, Assets, Agents, Automations, Dashboards, Environments)
- Delete INTELLIGENCE section (Analytics, Reports, Audit, Activity)
- Keep YOUR SYSTEMS dynamic block (lines 333–384) — this becomes the visual spine.
- Keep Tasks, Inbox, Calendar in WORK section. Drop the WORK label — three items don't need a header.

### Routes to remove from nav (but leave routable for now)
Move pages to `_archive/` OR keep in place but unlinked. Recommended: keep in place, unlink only. Faster, reversible if you change your mind in week 2.

Routes to unlink:
- `/finance`, `/time-tracking`, `/approvals`, `/assets`
- `/forms`, `/views`, `/documents`, `/templates`, `/mastery`
- `/agents`, `/automations`, `/dashboards`
- `/workflows`, `/goals` — these become **tabs** inside System pages (Phase 5), not standalone destinations
- `/integrations`, `/environments` — move into Settings
- `/analytics`, `/reports`, `/audit`, `/activity` — consolidate into Settings → Intelligence (Phase 6)

### `app/settings/page.tsx`
Add sections for the absorbed concepts: Environments, Integrations, API Keys, Billing, Team, Autonomy. Each is a settings panel, not a top-level nav.

---

## Acceptance criteria

- [ ] New user signing up sees ≤6 nav items + Settings + their dynamic Systems.
- [ ] No nav item leads to an empty page (all 6 do something on day 1).
- [ ] Cmd+K palette still finds archived routes by name (so you can navigate manually if needed).
- [ ] Tests for archived pages are deleted, not commented out.
- [ ] No `// TODO restore later` comments. Either it ships or it's deleted.

---

## What you DO NOT do in Phase 1

- Do not redesign the sidebar visually. Same chrome, fewer items.
- Do not touch onboarding yet (that's Phase 2).
- Do not touch the dashboard yet (Phase 3).
- Do not refactor the archived pages. Just unlink them.

---

## Risks

1. **Grief response.** Deleting shipped work hurts. Push through. Day 3 it stops hurting.
2. **A user (you, testing) clicks a missing route.** That's the point. Let it 404 or redirect to `/systems`. Don't preserve URLs.
3. **Tests break.** Expect ~30–40% test breakage. Triage: keep tests for Systems/Workflows/Nova/integrations/billing. Delete the rest.

---

## Done when

A screenshot of the sidebar fits in 600px of vertical space and a stranger can guess what every item does in <2 seconds.
