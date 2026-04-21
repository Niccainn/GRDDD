# Phase 2 — Onboarding that earns the thesis

**Goal:** New user lands on a populated, running System — not an empty dashboard.
**Duration:** Days 4–7 of week 1, into early week 2.
**Reversibility:** Medium. The flow can be tuned; the principle (deliver one working System before sidebar) cannot.

---

## The current failure

[app/onboarding/page.tsx:514](app/onboarding/page.tsx:514) creates an empty "Getting Started" System and dumps the user at `/dashboard`. The dashboard scores 4/10 in the audit because there is nothing to do. The thesis (Systems-first, Nova-as-operator) is invisible at the moment of highest user attention.

---

## The new 3-step flow

### Step 1 — Wedge picker
**Question:** "What do you want Grid to run for you?"

Six concrete options. No personas, no "solo vs team." Each option is a real recurring job:

| Option | Wedge | Integrations needed |
|---|---|---|
| Inbox triage & reply drafting | Founder/exec inbox | Gmail or Outlook |
| Weekly content pipeline | Solo creator / marketing | Notion or Google Docs + Slack |
| Client onboarding | Agency / consultancy | Gmail + Calendar + Stripe |
| Invoice + receipt capture | Bookkeeping | Gmail + Stripe (+ optionally Mercury) |
| Founder calendar defense | Founders with too many meetings | Google Calendar |
| Custom (advanced) | Power users | Skip to blank System |

Each option is a card with: icon, one-line description, list of integrations it'll connect, "this takes ~3 minutes" tag.

### Step 2 — Connect 1–2 integrations (real OAuth, not "later")
- Use the existing integration flows.
- If user denies an integration, do not let them proceed with that wedge — offer a different wedge.
- If integration is missing in the catalog, the wedge isn't shipped yet. Don't show it.

### Step 3 — Nova builds the System live
This is the hero moment.

A single full-bleed view shows Nova narrating construction in real time:
```
✓ Creating System: Inbox Triage
✓ Adding Workflow: Classify → Draft → Review
✓ Connected Gmail (3,421 messages indexed)
✓ Trained on your last 30 days of replies
✓ Ready — 3 drafts waiting for your review
```

Each line streams in. Total time: 20–40 seconds. **Pre-warm the templates** so Nova is "constructing" what's already prepared — this is honest theatre. The user sees agency at work.

End state: redirect to `/systems/[id]` of the populated System with 3 real drafts (or equivalent first-output) already waiting. **Not** `/dashboard`.

---

## Files to edit

### Replace
- [app/onboarding/page.tsx](app/onboarding/page.tsx) — full rewrite of steps. Keep the existing 5-step structure's *visual chrome* (progress bar, glass cards), replace the content.

### New
- `app/onboarding/wedges.ts` — the 6 wedge definitions (config only, no code).
- `app/onboarding/build-stream/route.ts` — SSE endpoint that streams the construction narration.
- `lib/onboarding/build-system.ts` — server action that actually creates the System + Workflow + initial run for a given wedge.

### Touch
- [app/api/systems](app/api/systems) — confirm POST creates with the new wedge metadata.
- Existing integration OAuth flows — confirm they redirect back into onboarding correctly (use `?from=onboarding&wedge=inbox-triage` query).

---

## Acceptance criteria

- [ ] Time from "Create workspace" click to first Nova-completed action: **<5 minutes** measured end-to-end.
- [ ] Every wedge produces ≥1 real, useful artifact in Step 3 (not a placeholder).
- [ ] If a user picks "Inbox triage" and denies Gmail OAuth, they see "Pick a different wedge" not "Continue anyway."
- [ ] Onboarding routes user to `/systems/[id]`, never `/dashboard`.
- [ ] Sidebar (6 items) is **hidden** during onboarding. Only the wizard is visible.

---

## What you DO NOT do

- Do not let users "skip" to a blank workspace. Custom is the only escape hatch and it still creates *one* configured System.
- Do not ask for brand voice, tone, audience in this flow. That's a setting they can fill later. It's a friction tax with no payoff at signup.
- Do not show the workspace name input as a separate step. Default to the user's name + " Workspace"; let them rename in Settings.

---

## The wedge selection problem

You can ship the flow with 2 wedges, not 6. **Inbox triage** + **Founder calendar defense** are the safest first two because:
- You (the builder) are the user. You'll dogfood honestly.
- The integrations (Gmail, Google Calendar) are already wired.
- The output (drafts, calendar suggestions) is verifiable in seconds.

Ship 2 wedges in week 1. Add wedges 3–6 only after 5 users have used the first 2.

---

## Done when

Five strangers sign up cold, pick a wedge, and have Nova produce a real artifact in under 5 minutes — without you in the room.
