---
name: positioning-canvas
description: Use this skill when the question is "who is GRID for, what is it, why us, what's the proof" — before writing any landing copy, before a competitor teardown, when positioning feels fuzzy, or when the market-state audit surfaces a narrative gap. Produces the single source of truth every other marketing skill reads from.
---

# Skill: positioning-canvas

## When to invoke

- Before `landing-page-build`, `narrative-draft`, `competitor-teardown` (they read the canvas)
- "Our positioning is fuzzy" / "what are we actually selling"
- A `marketing-feedback-loop` innovation finding suggests the wedge is wrong
- Quarterly positioning review

## Source of truth inputs

- `CLAUDE.md` — the product's stated identity + tenets
- `docs/GRID-MARKET-STATE.md` — what's *actually* shipped (canvas claims must be backed by real code, not aspiration)
- `docs/MARKETING_LOOP.md` — innovation-lane findings (how users actually describe it)

## Procedure

Produce / update `docs/POSITIONING.md` with exactly these fields. No fluff, no banned words (CLAUDE.md voice), every claim backed by a `GRID-MARKET-STATE.md` reference:

```
# GRID Positioning Canvas — v<n> · <date>

## Who (the one user)
<the specific operator, not "businesses". Concrete role + context.>

## Their pain (in their words)
<the problem as the user would say it, not as we'd market it>

## What GRID is (one sentence, load-bearing words only)
<from CLAUDE.md / BRAND_GUIDELINES one-line positioning — do not invent a variant>

## Why us (the defensible difference, backed by code)
<the thing that's real + hard to copy. Cite GRID-MARKET-STATE evidence.>

## Proof (what makes the claim believable today)
<shipped capability, not roadmap. If it's roadmap, say "roadmap".>

## Not-for (explicit anti-persona)
<who should bounce — sharpens the who>

## Open positioning questions
<anything unresolved → routes to marketing-feedback-loop innovation lane>
```

## Verification

- Every "why us" / "proof" line cites a real file or shipped surface (no aspiration smuggled in as fact)
- The one-sentence "what" matches CLAUDE.md / BRAND_GUIDELINES verbatim — not a paraphrase
- Anti-persona is specific enough to actually exclude someone
- Hands off to `brand-ops` for voice sign-off before it becomes the reference others use

## Failure modes

- **Aspiration-as-fact** — claiming SSO/SCIM/CMK (per market-state, not shipped) in "proof". Mark roadmap or omit.
- **Positioning-by-committee mush** — trying to be for everyone. The "not-for" field forces an edge.
- **Drift from CLAUDE.md** — inventing a snappier one-liner. The positioning sentence is fixed upstream; this canvas operationalizes it, doesn't rewrite it.

## Owner

`growth` (sign-off: `brand-ops`)
