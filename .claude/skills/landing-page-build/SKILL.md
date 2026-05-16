---
name: landing-page-build
description: Use this skill to build or substantially revise a marketing landing/route (a /use-cases/* page, /compare/* page, a new campaign LP, the home hero). Produces a spec the engineer agent implements — marketing drives real frontend, not mockups. Reads the positioning canvas; routes through brand-ops before ship.
---

# Skill: landing-page-build

## When to invoke

- "Build a landing page for X" / "add /use-cases/<segment>"
- Substantial home or /pricing hero revision
- A `campaign-brief` needs a destination page
- A `conversion-audit` recommends a rebuild over a patch

## Inputs (read first)

- `docs/POSITIONING.md` (run `positioning-canvas` first if stale)
- `CLAUDE.md` voice + visual discipline; `docs/BRAND_GUIDELINES.md`
- `lib/marketing-cta.ts` — CTA is the single toggle, never hardcode
- An existing sibling page as the structural template (e.g., `app/use-cases/<existing>`) — additive, match the pattern

## Procedure

```
1. Spec the page (this skill's output — a doc, not code):
   - Route + file path (app/...)
   - The one job of the page (what the visitor does next)
   - Section-by-section: purpose + the ONE message each section lands
   - Every string drafted in GRID voice (no banned words, no emoji,
     GRID uppercase, Atrium not Nova, no exclamation)
   - CTA: references MARKETING_CTA, never a hardcoded href
   - Components: reuse existing; only request new ones from `design`
     (stub) / `engineer` if a genuine gap — name the gap explicitly
   - Visual notes per BRAND_GUIDELINES (glass, monoline, extralight,
     single aurora-lime accent, whitespace as a feature)

2. Hand the spec to brand-ops for voice/visual sign-off.

3. Hand the signed spec to engineer to implement (additive — new
   route, reuse components, no layout restructure without approval).

4. After merge + deploy: run verify-deploy, then conversion-audit
   on the live page to set a baseline.
```

## Verification

- Spec has every string written out (engineer implements, doesn't author copy)
- CTA goes through `MARKETING_CTA` (grep the implemented page to confirm)
- No new top-level layout; additive route only (CLAUDE.md: add, don't move)
- `voice-check` clean; `brand-ops` signed off
- Live page baseline captured for the loop

## Failure modes

- **Marketing writing component logic** — stay in spec + copy; `engineer` implements. The handoff is the discipline.
- **Hardcoded CTA** — every marketing surface must use `MARKETING_CTA` or the open/close-signup toggle silently misses it (the PR #66/#78 lesson).
- **Net-new layout** — CLAUDE.md forbids restructuring major layout without approval. New *route* fine; new *shell* not.
- **Aspirational claims** — cross-check `docs/GRID-MARKET-STATE.md`; mark roadmap, don't imply shipped.
- **Emoji / banned words slipping in** — run `voice-check` before brand-ops, not after.

## Owner

`growth` (spec + copy) → `brand-ops` (sign-off) → `engineer` (build)
