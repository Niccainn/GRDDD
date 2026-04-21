# Phase 4 — Persistent Nova bar (Nova as presence, not page)

**Goal:** Nova is invokable from anywhere, context-aware, and visually unmistakable as the operating layer.
**Duration:** Late week 2 into early week 3. Budget 3 days.
**Reversibility:** Medium. Once users learn the hotkey, removing it is friction.

---

## The current failure

Nova is a sidebar nav item ([components/Sidebar.tsx:63](components/Sidebar.tsx)) and a `/nova` page. It is sized like Forms. The differentiator that survives Anthropic shipping Managed Agents is currently a route in a list.

The framing this fixes: "Grid uses Claude" → "Grid *is* an agent surface."

---

## The shape

A bar fixed to the bottom of every authenticated page. Two states.

### Collapsed (default)
- Height ~44px.
- A single input: "Ask Nova or describe what you need…"
- Right-aligned: current page context badge ("scoped to: Inbox Triage") + autonomy chip.
- Subtle ambient indicator when Nova is working in the background (a soft pulse — the signature motion from Phase 7).

### Expanded
- Height ~480px (or 60vh, whichever is smaller).
- Streaming conversation, tool calls visible.
- Approval inline for any action Nova proposes.
- "Pop out" to `/nova` for the full log/history view.

### Open mechanisms
- Click the bar.
- `Cmd+J` from anywhere (also `/` when no input is focused — like Slack).
- `Cmd+K` stays for nav search. Two distinct surfaces; do not conflate.
- Auto-open on contextual triggers (e.g., user opens an Inbox item with a draft pending).

### Close mechanisms
- `Esc` collapses to bar.
- Click outside collapses.
- Sending a message keeps it open until response completes; then auto-collapses if no follow-up in 5s (configurable).

---

## Context awareness (the part that matters)

Nova receives the current route + selection as context on every invocation. This is what makes "persistent" valuable instead of annoying.

| Where the user is | What Nova knows | What it suggests |
|---|---|---|
| `/systems/[id]` | The System, its Workflows, recent runs | "Improve the Draft stage's tone" / "Add an exception path for VIP senders" |
| `/inbox` | Current message or thread | "Draft a reply" / "Triage this into a Workflow" |
| `/calendar` with event selected | The event, attendees, history | "Decline politely" / "Suggest a 30-min variant" |
| `/dashboard` | Workspace summary | "What needs my attention?" / "Run the weekly review" |
| `/settings/integrations` | Integration list | "Why is Stripe failing?" |

Implementation: a React context provider wraps the app, each page registers its `novaContext` (a small object: `{ surface: 'system', id, selection? }`). Nova bar reads it on open.

---

## Files to add

### New components
- `components/nova/NovaBar.tsx` — the persistent bar (collapsed + expanded states).
- `components/nova/NovaConversation.tsx` — the streaming conversation surface (extracted from `/nova/page.tsx`).
- `components/nova/NovaContextChip.tsx` — the right-aligned context badge.
- `components/nova/AmbientPulse.tsx` — the background-activity indicator.

### New context
- `lib/nova/NovaContextProvider.tsx` — the React context for current-page scope.
- `lib/nova/useNovaContext.ts` — hook for pages to register context.

### New API
- `app/api/nova/invoke/route.ts` (likely already exists from `/nova` page) — confirm it accepts `context` payload and uses it in the system prompt.

### Touch
- `app/layout.tsx` — wrap children in `NovaContextProvider`. Mount `<NovaBar />` for authenticated routes only. Hide during onboarding.
- Each major page (`/dashboard`, `/systems/[id]`, `/inbox`, `/calendar`, `/tasks`) — add a `useNovaContext({ ... })` call to register scope.
- [app/nova/page.tsx](app/nova/page.tsx) — demote to log/history view. Keep streaming chat available via "Pop out" but it's no longer the entry point.

---

## Visual + interaction rules

- The bar is **always visible** when authenticated. Even on Settings.
- Collapsing is fast (<150ms). Expanding is fast (<200ms). No ceremony.
- Background-activity pulse uses the signature motion (Phase 7 — define once, reuse everywhere).
- Ambient pulse is unmistakable but never blocks UI. Subtle is the rule.
- Mobile: bar collapses to an icon in the bottom-right; tap expands to full-screen sheet. (Decide if you ship mobile in v1 — Phase 7 forces this decision.)

---

## Acceptance criteria

- [ ] Nova bar visible on every authenticated route except `/onboarding`.
- [ ] `Cmd+J` opens it from any page within 50ms.
- [ ] Context payload reflects the current page in network requests (verifiable in devtools).
- [ ] On `/systems/[id]/inbox-triage`, asking Nova "improve the draft stage" actually edits that System's draft stage workflow — not a generic answer.
- [ ] Closing the bar mid-stream does not cancel the request; reopening shows the completed response.

---

## What you DO NOT do

- Do not delete `/nova` route. Keep it as the log/history viewer. Power users will want it.
- Do not let the bar grow taller than 60vh. It is a tool, not a workspace.
- Do not put Nova bar inside onboarding. The onboarding *is* Nova at full screen — adding the bar duplicates it.
- Do not animate the bar's chrome elaborately. The signature motion is reserved for Nova *actions*, not UI affordances.

---

## Risks

1. **Performance** — every page now mounts a streaming-capable component. Lazy-load the conversation panel; only mount when expanded.
2. **Hotkey collision** — `Cmd+J` can collide with browser features. Test in Chrome, Safari, Firefox. Provide a settings override.
3. **Context leakage** — when user navigates mid-conversation, decide: keep old context or update? Default: keep until conversation closed. Show "context: Inbox Triage" badge so user knows.
4. **The page-mode `/nova` becomes confusing** — make it visually distinct (header says "Nova history" not "Nova"). It's archive, not entry.

---

## Done when

A user on any page can press `Cmd+J`, type "what should I do next?", and get a context-aware response in under 3 seconds — and the response references the page they were on, not the workspace generically.
