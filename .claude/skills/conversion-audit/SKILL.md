---
name: conversion-audit
description: Use this skill to teardown a marketing page or funnel for conversion friction — after building a landing page (baseline), when a page underperforms, before a campaign points traffic at it, or when the marketing-feedback-loop flags a drop-off. Produces a ranked friction list + experiments, routed advisory-first.
---

# Skill: conversion-audit

## When to invoke

- New landing page is live (capture a baseline)
- "Why isn't /pricing converting" / a route underperforms
- Before a `campaign-brief` sends paid/owned traffic somewhere
- A `marketing-feedback-loop` finding cites a funnel drop-off

## Procedure

```
1. Define the funnel for the page: entry → the ONE intended action →
   completion. Name the single conversion event.

2. Walk it as a cold visitor (use the preview/prod URL). At each
   step note friction, ranked by severity:
   - Clarity: is the one job obvious in 5 seconds?
   - Trust: is every claim backed (cross-check GRID-MARKET-STATE)?
   - Effort: clicks/fields/decisions to the action
   - Continuity: does the CTA destination match the promise?
   - Brand: voice/visual breaks that leak amateurism (run voice-check)

3. For each friction, write: severity (P0/P1/P2), the friction,
   the hypothesis, the cheapest experiment to test it.

4. Output a ranked memo. Log the top 1-3 as marketing-feedback-loop
   findings (advisory) so they enter the durable queue and route to
   the right owner (copy→growth, UX→engineer, price→finance).

5. If analytics exist (data agent active / Vercel Analytics), attach
   the real number. If not, state "no instrumentation — qualitative
   only" rather than inventing a rate.
```

## Verification

- One named conversion event, not a vague "engagement"
- Every friction has severity + hypothesis + a falsifiable experiment
- Top findings logged to `docs/MARKETING_LOOP.md` (advisory), not just narrated
- No invented metrics — qualitative is labeled qualitative

## Failure modes

- **Opinion as audit** — "I'd make the button blue" with no hypothesis/experiment. Every item must be testable.
- **Inventing conversion rates** — without instrumentation you have qualitative friction, not numbers. Say so.
- **Boiling the ocean** — 30 nitpicks bury the 2 that matter. Rank hard; surface the P0s.
- **Skipping the loop** — an audit that lives only in chat evaporates. Log the actionable ones to the ledger.

## Owner

`growth` (with `data` when active for real funnel numbers)
