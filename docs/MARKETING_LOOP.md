# GRID — Marketing Loop Ledger

*Append-only. The durable queue that makes marketing not-a-silo and the founder not-a-bottleneck.*

This is where marketing observations become structured, routed, dispatchable findings. The `marketing-feedback-loop` skill writes here. Findings persist whether or not anyone's in a session — so when the founder returns, there's a ready-to-act queue, not a blank slate.

## How it works

- **Default mode: A (advisory).** A finding is observed, structured, routed to the owning agent, and logged here in state `ADVISORY`. Nothing ships automatically. The founder (or a future session) reads the ledger and dispatches.
- **Explicit mode: B (active).** Only on an explicit instruction — "ship LOOP-007", "promote LOOP-012 to active" — a finding is handed to the `engineer` agent, which implements behind a PR. The founder's merge gate still holds. B is never the default; it's a one-sentence promotion of an already-structured A finding (no re-briefing).
- **Anti-bottleneck:** the loop keeps observing + drafting findings continuously. The founder being away never stalls product potential — it just means the queue grows and waits. Promotion is cheap because the finding is already complete.

## Two lanes

1. **Fix lane** — a concrete friction/inconsistency with a clear owner (copy → `growth`, UX → `engineer`, price signal → `finance`). Most findings.
2. **Innovation-intersection lane** — a higher-order signal: users describing the product differently than the copy, a wedge that's stronger than the current positioning, an emergent use case. These route to `product` (when active) or sit logged for the founder. This lane is the point of "seek innovation intersection" — surfacing where the product *could* go, not just what to patch.

## Finding format

```
## LOOP-NNN · YYYY-MM-DD · <lane: fix|innovation> · <category>

Observation: <what was seen — concrete, with the signal/number if any>
Hypothesis:  <why it's happening / what it implies>
Routes to:   <owning agent(s)>
State:       ADVISORY | PROMOTED→<agent> | SHIPPED(<pr>) | DECLINED(<reason>)
Promote:     "<exact one-liner that moves this to B>" 
Evidence:    <file:line / URL / support quote / metric source>
```

NNN is zero-padded sequential. Never edit a closed finding — append a new one that supersedes it and note `supersedes LOOP-NNN`.

## Routing table

| Signal type | Owner | Default action |
|---|---|---|
| Copy reads wrong / off-voice | `growth` | Advisory: draft the rewrite, hand to `brand-ops` |
| Page/funnel converts poorly | `growth` + `data`(stub) | Advisory: `conversion-audit` skill output |
| UX friction (component, flow) | `engineer` | Advisory: written spec; B = PR |
| Users describe product ≠ copy | `product`(stub)→founder | Advisory innovation finding — judgment, not a patch |
| Pricing/packaging signal | `finance` | Advisory: option memo |
| Competitive gap | `growth` + `product`(stub) | Advisory: `competitor-teardown` skill output |
| Brand drift across surfaces | `brand-ops` | Advisory: `messaging-qa` skill output |

When a routed-to agent is a stub (`product`, `data`), the finding still logs here in full — it does not evaporate. It activates the moment that agent does, or the founder picks it up directly.

---

## Findings

## LOOP-001 · 2026-05-16 · innovation · positioning

Observation: The brutally-factual market-state audit (`docs/GRID-MARKET-STATE.md`) found users/signals describe GRID as "the thing that watches my Stripe + Notion and tells me what broke" — a cross-domain-watch story — while the shipped pricing/landing copy leads with the workflow-builder + autonomy framing.
Hypothesis: The cross-domain *observability* wedge may be a sharper entry narrative than the workflow-automation framing. Worth a positioning experiment, not a copy patch.
Routes to: `product` (stub) → founder until active; `growth` for any positioning-canvas work
State: ADVISORY
Promote: "promote LOOP-001 to active" → `growth` runs `positioning-canvas` + drafts an A/B of the two narratives (B still gates on founder merge)
Evidence: `docs/GRID-MARKET-STATE.md` §8 (market position) — quote vs shipped `app/page.tsx` hero

*(Seed entry — demonstrates the innovation lane + the no-bottleneck design: this sat the moment it was observed, costs nothing while it waits, promotes in one sentence.)*

---

*Ledger discipline: append, never rewrite. A finding's whole value is that future-you (or a fresh session) can act on it cold — so each entry is self-contained. If the file exceeds ~400 findings, archive closed ones to `MARKETING_LOOP_ARCHIVE.md`, keep open ones here.*
