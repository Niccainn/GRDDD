<!-- PR template. Keep it tight. One sentence per bullet where possible. -->

## What changed

_One memo-voice paragraph describing the observable behavior before and after._

## Why

_One sentence on the underlying reason, not the symptom._

## Checklist

- [ ] Voice check against `CLAUDE.md` — no marketing adverbs, concrete nouns, memo not marketing
- [ ] Brand-color and monoline-stroke icons only, no emoji in shipped UI
- [ ] New widgets carry `DataOriginTag` (or equivalent provenance affordance)
- [ ] Empty states explain the feature in one sentence and offer one starter action
- [ ] Every mutation fires the corresponding `grid:{entity}-changed` event
- [ ] Every route that writes verifies ownership or calls `requireRole(...)`
- [ ] Every autonomous action is reversible within 24 hours (or explicitly not, with reason)
- [ ] Verified on mobile viewport (375×812) for any UI change

## Trace

_Links to the Project, System, or Environment affected. Screenshots if UX-facing._
