# GRID — Design Identity

**One-line pitch:** if Apple designed an operations canvas, inspired by the way information flows through nature — organized, unhurried, high-end.

This doc is prescriptive. Every new surface, widget, and flow should map to the pillars below. When something feels off, it's almost always because one of these was skipped.

---

## Pillars

### 1. Environmental, not dashboard
GRID is a landscape. Aurora, weather, currents, horizon. Data doesn't sit in a grid of cards — it drifts, pulses, and settles. The user looks at their business the way you look at a sky, then zooms in when something calls attention.

- **Body** has a living aurora behind every page (`body::before`, 42s drift cycle).
- **Active states** use `aurora-pulse` — the green halo breathes while Nova is working or an integration is syncing. Replaces spinners.
- **Long processes** show a `flow-line` — a single thin current running left-to-right at the bottom of the surface, like electricity through a wire.

### 2. One accent, used sparingly
**GRID green (`#15AD70`)** is the only saturated colour on screen. It earns its loudness by being the only one. Semantic colours (warning yellow, danger red, info blue) are still available but used for actual semantic states — never decoration.

Tokens:
- `--brand` `#15AD70` — the default green
- `--brand-bright` `#1BD089` — aurora moments, hover, focus
- `--brand-deep` `#0F7E52` — moss, restful borders

If a new feature wants to "differentiate with a color," the answer is no. Differentiate with motion, light, or layout.

### 3. Apple-restraint typography
Two voices, each with a job.

| Voice | Family | Use for |
|---|---|---|
| **Geist sans** (existing) | `var(--font-geist-sans)` | Everything — body, UI, labels, numbers |
| **System serif** (new) | `ui-serif, 'New York', Iowan Old Style, Baskerville, Georgia` | Hero moments ONLY — landing H1, page titles, single-metric dashboards |

Add the serif with `className="display-serif"`. It's native on macOS/iOS (Apple's "New York"), native-ish everywhere else. Zero download. Zero cost.

**Rules:**
- Weight 200–300 for display text. Never 700.
- Letter-spacing `-0.02em` on anything 1.5rem+.
- Numbers are always `font-variant-numeric: tabular-nums`.
- Eyebrow labels are 10px, 0.18em letter-spacing, uppercase — use `.eyebrow`.

### 4. Tactile chrome, weightless motion
Every interactive surface has depth you could almost press. Every motion is slow and expensive-feeling.

- **Chrome buttons** (`.chrome`, `.chrome-pill`, `.chrome-circle`) have neumorphic shadow + 0.5px translate on hover/press. Apple Vision Pro lineage.
- **Glass panels** (`.glass`, `.glass-deep`) blur 40–80px with inset highlight.
- **Timing:** 200ms for micro-interactions, 400ms for state changes, 6–42s for ambient drift.
- Bounce easings are banned except for one place: the scaffold celebration. Everything else is `cubic-bezier(0.4, 0, 0.2, 1)`.

### 5. Contrast is non-negotiable
Every text step is WCAG AA at minimum. The old `text-2` and `text-3` were 4.8:1 and 4.0:1 respectively on dark — failed for body copy. Now:

| Token | Dark (#08080c) | Light (#f2f2f5) | Use for |
|---|---|---|---|
| `--text-1` | 19:1 | 16:1 | Body, headings |
| `--text-2` | 10:1 | 8.5:1 | Secondary copy |
| `--text-3` | 6:1 | 5.1:1 | Tertiary labels |
| `--text-4` | 4:1 | 3.4:1 | **Large text only** (≥18px). Never for body. |

---

## Component voice

When composing a new screen, run it through this checklist:

- [ ] Is there an **aurora** somewhere — either the ambient body layer or a scoped `ambient-bg`?
- [ ] Is there **one** brand accent, or multiple?
- [ ] Do I have **one serif moment** per page (hero, title, or stat) — not more?
- [ ] Are my text steps distinct enough you can tell hierarchy from 3 feet away?
- [ ] Does something **breathe** (drift or pulse) somewhere on the page, at a speed that wouldn't distract a reader?
- [ ] Can someone using `prefers-reduced-motion` still read everything clearly?
- [ ] Did I add a new colour? If yes — delete it.

---

## What NOT to do

- ❌ Multi-colour dashboards. (Every pie-chart segment green + fade is fine; rainbow is not.)
- ❌ Bouncy easing. We're not a consumer game.
- ❌ Drop shadows without inset highlights. Depth is *tactile*, not Photoshop-y.
- ❌ Spinners. Use `flow-line` or `aurora-pulse` instead.
- ❌ 700-weight display text. Our typography is light.
- ❌ Opacity as hierarchy shortcut below 0.55. If it's unreadable, the copy wasn't important to begin with — delete it.
- ❌ Coral, purple-coded integration branding, or any other saturated accent that isn't `--brand`. Nova purple is the ONE exception, used only for Nova-owned surfaces.

---

## The Apple × environment thesis

Apple's operating aesthetic is: everything is made of light, and light obeys physics. Our environment thesis extends that: everything is made of weather, and weather obeys nature. A button is a stone warmed by sun. A pulsing integration is a pond with something moving under the surface. A drifting widget is a cloud in clear air.

None of that is metaphor in the copy — it's metaphor in the *motion and light*. The user doesn't need to be told "this is like nature." They feel it.

Ship accordingly.
