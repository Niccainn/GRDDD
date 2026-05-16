---
name: messaging-qa
description: Use this skill to check message consistency across every customer surface — the one-liner, the value props, the proof points should say the same thing on home, /pricing, /use-cases, blog, emails, OG tags. Extends voice-check (which catches rule violations) to catch story drift (where surfaces contradict each other).
---

# Skill: messaging-qa

## When to invoke

- After any positioning change (`positioning-canvas` updated)
- Before a launch (surfaces must agree)
- Periodic: monthly cross-surface sweep
- A `marketing-feedback-loop` finding shows surfaces contradicting each other

## Difference from voice-check

- `voice-check` = does this string break a rule (banned word, emoji, casing)? Per-file.
- `messaging-qa` = do the surfaces tell the SAME story? Cross-file. Drift, not violations.

## Procedure

```
1. Pull the canonical story from docs/POSITIONING.md:
   - The one-line "what GRID is"
   - The 2-3 core value props
   - The proof points (must be shipped, per GRID-MARKET-STATE)

2. Extract the equivalent claims from each surface:
   - app/page.tsx (home hero + sections)
   - app/pricing/page.tsx (plan value props)
   - app/access/page.tsx
   - app/use-cases/** and app/compare/** (lead claims)
   - app/blog/** recent posts (the through-line)
   - opengraph-image / metadata descriptions
   - lifecycle email drafts

3. Build a drift matrix: surface × claim. Flag where:
   - The one-liner is reworded (it must be verbatim from
     CLAUDE.md/BRAND_GUIDELINES — no variants)
   - A value prop appears on one surface, contradicted on another
   - A proof point is claimed on one surface that GRID-MARKET-STATE
     says isn't shipped (aspiration drift)

4. Output the matrix + a ranked fix list. Log material drift as
   marketing-feedback-loop findings routed to growth (copy) — and
   to product (stub) if the drift reveals a positioning question,
   not just a copy slip.
```

## Verification

- One-liner is byte-identical across every surface (no "improved" variants)
- No value prop on surface A contradicts surface B
- No surface claims a proof point market-state lists as unshipped
- Drift items logged to the loop, not just narrated

## Failure modes

- **Treating it as voice-check** — this is about story coherence across surfaces, not per-string rule breaks. Different lens.
- **One-liner variants** — the single biggest drift source. Marketing instinct is to "freshen" it per page; the brand rule is one sentence, no variations.
- **Aspiration drift** — /pricing claims SSO (not shipped per market-state) while home doesn't mention it → inconsistent AND overclaiming. Both problems.
- **Matrix without action** — a drift report nobody dispatches. Log the material ones to `MARKETING_LOOP.md`.

## Owner

`brand-ops` (owns consistency) — executed with `growth`; positioning-level drift escalates to `product` stub / founder
