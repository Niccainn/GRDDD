---
name: narrative-draft
description: Use this skill to draft the weekly build narrative, a blog post, or a long-form editorial piece in GRID's voice. The cadence (running GRID on GRID, published) is the product selling itself. Reads positioning + market-state for ground truth; routes through brand-ops.
---

# Skill: narrative-draft

## When to invoke

- Weekly narrative cadence (the public build log)
- A blog/editorial post is requested
- A shipped capability is worth a written moment
- A `marketing-feedback-loop` finding suggests a story angle

## Inputs

- `docs/POSITIONING.md` — the spine the narrative reinforces
- `docs/GRID-MARKET-STATE.md` — what's actually true (never narrate aspiration as shipped)
- `git log` since last narrative — what actually happened
- `CLAUDE.md` voice rules + `docs/BRAND_GUIDELINES.md` blog/editorial section

## Procedure

```
1. Pull the real material: git log since the last post, what shipped,
   what broke and got fixed (INCIDENT_LOG is honest fuel — "honest
   theatre only" per CLAUDE.md). The narrative is a memo, not a brag.

2. Structure (BRAND_GUIDELINES blog shape):
   - One hero moment (a serif pull-quote OR one real number)
   - 600–1500 words, short essays not SEO doorstops
   - One beat per sentence, concrete nouns, numbers over adjectives
   - Lands on what it means for the reader, not "look what we built"

3. Honesty check: did something break this week? Say so. The trust
   contract (CLAUDE.md voice rule 4) is the differentiator — a
   sanitized narrative reads like every other startup blog.

4. Voice-check → brand-ops sign-off → publish destination
   (route via the editorial surface; drafts have no home until
   Google Drive MCP is wired — note that, don't invent a location).
```

## Verification

- Every claim traceable to a real commit/ship (no aspiration)
- A real failure is acknowledged if one happened (honest theatre)
- Voice: no banned words, no exclamation, GRID uppercase, Atrium not Nova
- `brand-ops` signed off
- Length + shape per BRAND_GUIDELINES editorial section

## Failure modes

- **Brag-narrative** — "we crushed it this week". CLAUDE.md voice rule 1: memo not marketing. State the thing, stop.
- **Sanitized failure** — hiding the break removes the only thing that makes the cadence trustworthy. Honest theatre is the moat.
- **Aspiration as shipped** — narrating roadmap as done. Cross-check market-state.
- **SEO doorstop** — padding to 2500 words for ranking. Short essay; the cadence compounds, not the word count.

## Owner

`growth` (sign-off: `brand-ops`)
