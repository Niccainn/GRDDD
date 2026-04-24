# GRID — agent instructions

This file is the voice and discipline doc for any AI (Claude, codegen, future
contributors) working in this codebase. Keep it short, keep it honest.

## What GRID is

GRID is a **workspace that acts** — a living business OS that reads
every surface (docs, calendar, email, finance, code), acts with calibrated
autonomy via Nova, and proves its work. Not a dashboard. Not a chatbot. Not a
workflow builder. A substrate that sits underneath all three.

The product's job is to be **invisible but powerful, like nature**. Every UI
decision is judged against that frame. If it looks like a 2015 SaaS dashboard,
it is wrong.

## Voice (four rules)

1. **Write like a memo, not marketing.** Short sentences. Concrete nouns. No
   "unleash," "empower," "supercharge," "seamless," "revolutionary." Say the
   thing, then stop.
2. **Explain the why in one line.** Every feature, every copy block, every
   error state earns its space by answering "why is this here?" in a sentence
   a Monday-morning operator would recognize.
3. **Show the trace.** When Nova acts, we say what it read, what it decided,
   and what it skipped. "Because" beats "powered by" every time.
4. **Honest theater only.** If we say Nova is doing something, it's doing it
   right then. We don't fake progress bars. We show real work, even if slow.

## Visual discipline

- **Brand colors only.** `#C8F26B` (brand), the environment accent palette
  (`#7193ED`, `#BF9FF1`, `#E879F9`, `#F5D76E`, `#6395FF`, `#FF8C69`,
  `#15AD70`), and the neutral text/glass variables.
- **Dots, circles, monoline strokes.** No emoji in shipped UI. No multicolor
  icons. No illustration libraries.
- **Glass + depth, not flat-SaaS.** `var(--glass)`, `var(--glass-border)`,
  soft shadows. Backdrop blur > solid fills.
- **Extralight / light font weights.** Tighter tracking on headings
  (`letterSpacing: '-0.02em'`). No bold outside data callouts.
- **Whitespace is a feature.** Airier than feels comfortable.

## Architecture tenets

- **Event-driven sync across surfaces.** When a model mutates, fire a
  `grid:{entity}-changed` custom event; any subscribed component re-fetches.
  Sidebar, lists, switchers stay live without page reloads.
- **Nova is a mediator, not a feature.** Every page that exposes data should
  also expose the Nova surface that acts on it. Never a separate tab.
- **Additive, not destructive.** New features layer onto existing surfaces.
  Rewrites that clear what a user sees are a failure mode.
- **Long-context first.** Prefer one Claude call with the full context over
  multiple short calls stitched together. The model handles it; we don't need
  to.
- **Trust is a first-class UI element.** Every autonomous action has a "why"
  panel, a reversal path, and a log entry. Trust primitives live on the page,
  not in a settings tab.

## Naming

- **Environment** (not Dashboard, Workspace, or Tenant) — the top-level
  container for a team's work.
- **System** — a named capability within an Environment (e.g. "Inbox
  Triage"). Everything hangs off a System.
- **Workflow** — a specific flow of steps executed by a System.
- **Nova** — the agent. Never "the AI," never "the bot," never "our
  assistant."
- **Signal** — an inbound alert needing attention. Not "notification,"
  not "alert."

## Don'ts

- Don't create documentation files (`*.md`, `README.md`) unless explicitly
  requested.
- Don't add emoji to shipped UI. Anywhere.
- Don't add "Coming soon" badges. Ship it or hide it.
- Don't introduce new third-party analytics. Use existing `AuditLog`,
  `IntelligenceLog`, `ExecutionReview`.
- Don't restructure the app's major layout without explicit approval. Add,
  rename, and wire. Don't move.
