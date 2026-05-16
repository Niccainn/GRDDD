---
name: marketing-feedback-loop
description: Use this skill whenever a marketing signal appears that should influence the product — a page converts poorly, users describe GRID differently than the copy, a competitor query trends, support themes recur, a pricing objection repeats. Turns the observation into a structured, routed, durable finding in docs/MARKETING_LOOP.md. Default is advisory (A); active implementation (B) only on an explicit "ship LOOP-NNN" instruction.
---

# Skill: marketing-feedback-loop

## When to invoke

- A marketing surface underperforms (low CTR, high bounce, drop-off)
- Users / support describe the product differently than the copy does
- A competitive or category signal trends
- A pricing/packaging objection repeats
- Any "marketing learned something the build should know" moment
- Explicit promotion: "ship LOOP-007", "promote LOOP-012 to active"

## The two modes

- **A — advisory (DEFAULT, always, unless explicitly told otherwise).** Observe → structure → route → log in `docs/MARKETING_LOOP.md` as `ADVISORY`. Nothing ships. The finding waits in the durable ledger. This is the no-bottleneck design: the loop keeps producing while the founder is away; the queue grows and stays actionable.
- **B — active (EXPLICIT ASK ONLY).** Triggered by a one-liner referencing an existing finding ("ship LOOP-007"). The finding is already complete, so no re-briefing. Hand to the `engineer` agent → implement behind a PR → founder's merge gate still holds. Update the finding's `State` to `PROMOTED→engineer` then `SHIPPED(<pr>)`.

Never auto-promote. Never treat "this seems important" as a B trigger. The founder's words "ship"/"promote"/"go active" are the only B triggers.

## Procedure (mode A — the default)

```
1. Capture the observation concretely. Numbers if any. The user's actual
   words if it's a description-mismatch. No hype, no paraphrase-inflation
   (per CLAUDE.md voice + docs/GRID-MARKET-STATE.md discipline).

2. Classify the lane:
   - fix          → concrete friction, clear owner
   - innovation   → higher-order: a wedge, an emergent use case, a
                    positioning gap. Routes to product(stub)→founder.
                    This lane is the "innovation intersection" — surface
                    where the product COULD go, not just what to patch.

3. Route per the table in docs/MARKETING_LOOP.md.

4. Append a finding to docs/MARKETING_LOOP.md using the exact format
   (LOOP-NNN, zero-padded sequential, self-contained, with a one-line
   Promote: instruction).

5. If the owning agent is ACTIVE and the fix is pure-advisory cheap
   (e.g., growth drafting a rewrite), produce that draft now and attach
   it to the finding — but still do not ship it. Advisory = ready, not
   shipped.

6. Stop. Report: "Logged LOOP-NNN (advisory). Promote with: <one-liner>."
```

## Procedure (mode B — explicit promotion only)

```
1. Read the referenced finding from docs/MARKETING_LOOP.md. It must
   already be complete (it was logged in mode A). If it isn't, refuse
   and log/complete it as A first — B never invents scope.

2. Hand the finding to the engineer agent as a spec (copy fix, UX
   change, component, route). For copy/visual, route through brand-ops
   review before the PR opens.

3. engineer implements behind a PR. The founder's merge gate is
   untouched — B ships a PR, not to main.

4. Update the finding: State → PROMOTED→engineer, then SHIPPED(#NN)
   when the PR merges, or DECLINED(<reason>) if the founder rejects.

5. Append a one-line entry to docs/INCIDENT_LOG.md if the loop
   surfaced something that should never have shipped in the first
   place (so the upstream gap gets a guard).
```

## Verification

- Every invocation produces exactly one new `LOOP-NNN` entry (mode A) OR one state transition on an existing entry (mode B)
- The entry is self-contained: a cold session or the founder can act on it without this conversation's context
- `State` is accurate; `Promote:` is a literal one-liner
- B only ever ran because the founder said "ship/promote/go active" + a finding ID
- No finding was lost because its owner was a stub — it's in the ledger regardless

## Failure modes

- **Auto-promoting** — the single biggest risk. "This is clearly important so I'll just ship it" violates A-default. The founder chose A-default explicitly. Importance is not a B trigger; an explicit instruction is.
- **Hype creep** — marketing findings inflated past the evidence ("users love X" when one user said X). Quote the raw signal. The market-state doc's no-hype rule applies here.
- **Finding evaporation** — routing to a stub agent (`product`, `data`) and then dropping it. The ledger entry is the durable artifact; the stub-ness of the owner is irrelevant to logging.
- **Re-briefing on promote** — if "ship LOOP-007" requires re-explaining LOOP-007, the original A entry was incomplete. A entries must be complete enough to promote in one sentence; that's the whole anti-bottleneck mechanic.
- **Ledger rewrite** — editing a closed finding. Append a superseding entry instead; the history is the value.

## Owner

`growth` (runs the loop; routes to `engineer`/`finance`/`brand-ops`/`product`-stub per the table)
