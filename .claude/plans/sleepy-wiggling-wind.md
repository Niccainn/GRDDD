# Plan: Rebuild GRID Pitch Deck — 15 Slides, 30-Minute Format

## Context
Rewrite the existing `pitch/build_deck.js` (15 slides, pptxgenjs) to incorporate the full positioning — founder story, GTM, comparables, key metrics, "how it's different" framing — while keeping it to 15 slides digestible in 30 minutes. Works for VC (Baukunst), crowdfunding, and general awareness.

## File to modify
`/Users/nc/projects/grid/.claude/worktrees/nervous-heyrovsky/pitch/build_deck.js`

## Approach
Rewrite slide content only. Keep all existing visual infrastructure (palette `C`, fonts `F`, helpers `baseSlide()`, `card()`, `eyebrow()`, `footer()`, `gridLogo()`, layout constants). `TOTAL` stays 15.

## 15-Slide Structure

| # | Eyebrow | Headline | What's on it |
|---|---------|----------|-------------|
| 1 | COVER | "One person. The output of an entire team." | Logo, pre-seed 2026, Nicole · Founder, $350K/$500K. Keep existing. |
| 2 | THE PROBLEM | "Every knowledge company drowns in coordination overhead." | 4 stat cards: $600K wasted, 32h/content piece, 62% PM time, 8-12 AI tools unmanaged. Bottom: "AI made output trivial. It made structure exponential." |
| 3 | THE THESIS | "When intelligence becomes infinite, structure becomes the only advantage." | GRID Equation S=f(Id,If,In). Keep existing. |
| 4 | THE SOLUTION | "Not a second brain. A workspace that acts." | Three columns: Environments → Systems → Workflows. Subtitle: "Everything is connected. Everything acts. Everything learns." Merge current slides 4+5 (architecture + Nova) — add Nova capabilities as bullet list in a right-hand card. |
| 5 | HOW IT'S DIFFERENT | "Everyone is building chat. We are building structure." | **NEW.** Three horizontal cards with the killer differentiation: (1) "Not a tool — the layer tools run on" (2) "Not a copilot — a constraint engine" (3) "Structure is the moat, not the model." Each with 2-line proof point. |
| 6 | PRODUCT | "Attention, not notifications." | Keep existing Attention Widget mock (home screen with signal triage). |
| 7 | USE CASES + PROOF | "Every department. One system. Measured." | **MERGED.** 4 cards combining use case + KPI: Content (4min/8.4 quality), Marketing (3min/14 posts), Operations (60% less friction), Revenue (+37% in 30 days, -60% admin). |
| 8 | CASE STUDIES | "Real businesses. Real numbers." | **NEW.** Two case study cards side by side: Alex (solo designer, 6 before/after metrics) + Maya (content creator, 6 before/after metrics). Each with headline result. |
| 9 | FOUNDER | "Systems Designer. Full-Stack Builder. Two Years In." | **NEW.** Nicole's story — large format. Left: avatar + name + "Founder · Engineer · Designer · Systems Designer studying human behavior in digital environments." Right: The narrative (ran creative ops, built infrastructure for brands like Othership, 12+ tools, saw the structural gap, built GRID solo). Bottom-left: "483 files · 44+ routes · 11 Nova tools · $0 burn." Bottom-right: Post-raise hiring plan (3 hires). Brand voice quote: "Builds quietly. Slightly ahead of culture." |
| 10 | GTM | "Structure scales through partners, not ads." | **NEW.** Four-phase timeline: (1) Closed Alpha NOW (2) 5 Design Partners M1-4 (3) BYOK Beta M4-8 (4) Public Launch M8-14. Right side: Distribution wedges — White-label ($43K/yr per agency), Content (1M views/mo), BYOK (self-selecting sophisticates). |
| 11 | MARKET | "We are sizing the labor budget we replace." | Keep existing TAM $2.1T / SAM $310B / SOM $180M cards. |
| 12 | COMPETITION + COMPARABLES | "Everyone is building chat. We are building structure." | **MERGED.** Left: 2x2 positioning map (existing). Right top: 4 moat bullets (existing). Right bottom: Comparables strip — Stripe ($95B), Figma ($20B), Linear ($400M+), Notion ($10B) with one-line thesis comp each. "GRID = structure for organizational intelligence." |
| 13 | BUSINESS MODEL | "Four tiers. Margin protected at every level." | Keep existing pricing grid: Free/$39/$99/$299 with margins. Add-ons strip. |
| 14 | THE ASK | "$350K target. $500K hard cap." | Keep existing. SAFE at $3M cap, 18 months runway, use-of-funds bar, 4 milestone cards (5 partners M4, $10K MRR M8, 3 case studies M10, seed-ready M14). |
| 15 | CLOSE | "Build the structure layer before the intelligence layer locks in." | Keep existing vision close + 3 closing pillars + contact. |

## What Changed vs. Current Deck

**Removed (merged or cut):**
- Old Slide 5 (Nova standalone) → merged into Slide 4
- Old Slide 10 (Traction "shipped" list) → key numbers absorbed into Slide 9 (Founder) and Slide 7 (proof points)
- Old Slide 8 (Archetypes) → replaced by real case studies (Slide 8)
- Old Slide 13 (Team) → expanded into Slide 9 (Founder story)

**Added:**
- Slide 5: "How It's Different" — the strongest objection-handling framing
- Slide 8: Real case studies with before/after metrics (Alex + Maya)
- Slide 9: Deep founder story (Nicole's background, build, brand, philosophy)
- Slide 10: GTM strategy with distribution wedges
- Slide 12 now includes comparables (Stripe/Figma/Linear/Notion) alongside competition

## Implementation Details

Each slide will be rewritten as a `{ ... }` block following existing patterns. Key design decisions:

- **Slide 5 (How It's Different):** Three wide horizontal cards stacked vertically, each with a bold statement on left and proof point on right. Brand color accent lines.
- **Slide 8 (Case Studies):** Two equal-width cards. Each has: archetype tag, headline metric, 6-row before/after table using alternating row backgrounds.
- **Slide 9 (Founder):** Full-width card with avatar circle left, narrative text right. Bottom strip splits into "what's built" stat chips left and hiring plan right.
- **Slide 10 (GTM):** Four-phase horizontal timeline across top (connected by arrows). Bottom: three distribution wedge cards.
- **Slide 12 (Competition + Comparables):** Left half is existing 2x2 map. Right half: moat bullets top, comparables strip bottom (4 small cards with company name, valuation, one-line thesis).

## Verification
1. `cd /Users/nc/projects/grid/.claude/worktrees/nervous-heyrovsky && node pitch/build_deck.js`
2. Generates `pitch/GRID_pitch_deck.pptx` without errors
3. Open in PowerPoint/Keynote — verify 15 slides, all text readable, no overflow
