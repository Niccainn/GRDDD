---
name: campaign-brief
description: Use this skill before any marketing campaign or push (a launch, a channel test, a content series, an outreach motion) — produces a one-page structured brief: audience, channel, hook, destination, single success metric, kill criteria. Forces a measurable hypothesis instead of vibes.
---

# Skill: campaign-brief

## When to invoke

- "Run a campaign for X" / "let's push on channel Y"
- A launch needs coordination across surfaces
- Before spending time or money on any acquisition motion
- A `marketing-feedback-loop` finding suggests a test worth running

## Procedure

Produce a one-page brief. If any field can't be filled concretely, the campaign isn't ready — that's the point of the skill.

```
# Campaign Brief — <name> · <date>

## Hypothesis (one sentence, falsifiable)
"If we <do X> for <audience>, then <metric> will <move> because <why>."

## Audience (the one segment, specific)
<not "developers" — "solo operators running ops across Stripe+Notion+Slack who already pay for 3 point tools">

## Hook (the one message — on voice, no banned words)
<the single sentence that earns the click. Reads like the product, not an ad.>

## Channel + format
<where + the format. One primary channel for the test, not five.>

## Destination
<exact route. If it needs a page → landing-page-build first. CTA via MARKETING_CTA.>

## Single success metric + threshold
<ONE number. "200 qualified signups" not "more awareness". The threshold that = success.>

## Kill criteria
<the number/date at which we stop. Campaigns without a kill switch run forever on hope.>

## Cost ceiling
<time and/or money cap. Solo + zero-COGS posture (CLAUDE.md value 3) — be honest about the spend.>

## Loop hook
<what observation feeds back via marketing-feedback-loop regardless of outcome>
```

## Verification

- Hypothesis is falsifiable (has a clear "this failed" condition)
- Audience is specific enough to exclude people
- Exactly one success metric with a threshold
- Kill criteria + cost ceiling both set (no open-ended campaigns)
- Destination exists or is specced via `landing-page-build`
- A loop-hook is defined so the result enters `MARKETING_LOOP.md` either way

## Failure modes

- **Vibes campaign** — "raise awareness" with no metric. Unkillable, unmeasurable. The single-metric field forbids this.
- **Five channels at once** — can't read the signal. One primary channel per test.
- **No kill criteria** — sunk-cost campaigns. Force the stop condition up front.
- **Off-voice hook** — ad-speak. The hook is shipped copy; voice rules apply, `brand-ops` reviews.
- **No loop hook** — a campaign that teaches nothing whether it wins or loses is waste. Define the feedback before launch.

## Owner

`growth` (hook sign-off: `brand-ops`; spend reality-check: `finance`)
