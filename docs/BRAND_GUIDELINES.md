# GRID — Brand Guidelines

**Version 1.0 · April 2026**

This document is the source of truth for everything a customer, partner, or designer sees with the GRID name on it. It governs the product, the marketing site, social posts, pitch decks, emails, swag, events — everything.

If you're making something for GRID and this doc doesn't answer your question, ask before you ship. One wrong colour, one wrong font, one "Nova" written as "nova" and the whole thing stops feeling like itself.

---

## Part 1 — Essence

### One-line positioning
> **GRID is the AI operations layer — it watches your business and runs better versions for you.**

That's the sentence that goes on business cards, one-pagers, pitch decks, and the top of every landing page. Nothing else. No variations.

### The 30-second story
Most AI tools wait for you to ask a question, then answer it. GRID is different. You connect your systems — Google Calendar, Slack, Notion, Stripe, whatever you actually use — and GRID maps how your business actually runs. Then it runs it for you, gets better every time you accept or reject its output, and surfaces the moments that matter before they become problems.

Users don't "use" GRID the way they use Notion or Slack. They *inhabit* it. It's the quiet operational layer underneath their tools, not another app competing for attention.

### Three values (how we make every decision)

1. **Quiet over loud.** If a feature can whisper instead of shout, it whispers. Our product ambient-drifts, it doesn't bounce. Our copy states, it doesn't sell.
2. **Honest over impressive.** We don't ship "coming soon" buttons. We don't fake data. If something isn't working, we say so. Users trust what we show.
3. **Owned over rented.** Zero-cost posture — we build on what we already own, we don't rack up SaaS bills that end up on customer invoices. BYOK is the default. The user's keys, the user's data, the user's control.

---

## Part 2 — Voice

### Tone in one word: **Considered.**

Every sentence sounds like someone thought about it before saying it. No exclamation points. No "!". No marketing fluff. No "unlock", "supercharge", "revolutionize", "seamless", "next-generation", or any other word that would feel at home on a typical SaaS page.

### Voice rules

| Do | Don't |
|---|---|
| "AI that watches your business." | "AI-powered, next-gen business automation!" |
| "15.1 hours" | "💪 15.1 hrs of pure focus!" |
| "Nova couldn't read your Anthropic key. Reconnect at /settings/ai." | "Oops! Something went wrong. 😕 Please try again." |
| "Billing starts after the beta ends." | "Upgrade now — limited time offer!" |
| Contractions only when natural ("can't", "won't") | Forced casualness ("let's gooo", "y'all") |
| British-ish punctuation: single em-dash, serial commas | ASCII emoji, `:)` smileys, `!!` |

### Capitalisation rules (product nouns)

These always capitalised in running text, even mid-sentence:

- **GRID** (all caps, always. Never "Grid" or "grid")
- **Nova** (the AI assistant — always "Nova", never "nova")
- **System, Workflow, Signal, Task, Goal, Environment** (when referring to a product noun; lowercase when used as a common word)

These are NEVER capitalised unless starting a sentence:

- "ai" when part of a marketing sentence — we say "AI" in product, but "the AI operations layer" can render either way; pick once per surface and stay consistent

### Headline patterns

**Good headlines follow this shape:**
- **Declarative:** "AI that watches your business."
- **Two-beat:** "Connect your tools. Run better versions."
- **Defining:** "GRID is the operational layer, not another app."

**Good body copy follows this shape:**
- One beat per sentence. Short.
- Concrete nouns over abstract ones. ("Google Calendar" > "your workflow tools".)
- Numbers over adjectives. ("15.1 hours" > "tons of time".)
- Lands on a benefit, not a feature.

### Error messages — our most important writing surface

Errors are where most products break trust. We treat them as editorial moments.

**Bad:** "An error occurred."  
**Good:** "Google Calendar API is not enabled in your Google Cloud project. Enable it and refresh this page. [Enable Calendar API →]"

Every error tells the user (1) what's wrong in plain English, (2) why it's wrong, (3) what to do next — ideally as a one-click action.

---

## Part 3 — Visual system

### The single accent: GRID aurora-lime

One brand colour. That's the rule. Everything else is chrome, glass, and black. The lime earns its loudness by being the only saturated hue on screen.

| Token | Hex | Where to use |
|---|---|---|
| **`--brand`** (dark mode) | `#C8F26B` | Default accent — buttons, badges, status pills, the brand itself |
| **`--brand-bright`** | `#DAFF8C` | Aurora peak — hover, focus, pulse moments |
| **`--brand-deep`** | `#9BC93F` | Moss — darker fills, rarely used |
| **`--brand`** (light mode) | `#5E8A1F` | AA-compliant version for light backgrounds |
| **`--brand-soft`** | `rgba(200, 242, 107, 0.12)` | Translucent fills for cards |
| **`--brand-glow`** | `rgba(200, 242, 107, 0.08)` | Halos, pulses, ambient layers |

**Why this green:** it's bioluminescent moss under UV. A hue that doesn't live in SaaS and can't be copied without feeling derivative. The WindFarm/renewable-energy energy — alive, electric, organic.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| **`--bg`** | `#000000` | Crisp black. The page. |
| **`--bg-subtle`** | `#060608` | Slight elevation |
| **`--bg-elevated`** | `#0b0b0e` | Cards, modals |

### Text hierarchy (WCAG AA compliant on both modes)

| Token | Dark mode | Light mode | Use for |
|---|---|---|---|
| `--text-1` | 19:1 | 16:1 | Body copy, headings |
| `--text-2` | 10:1 | 8.5:1 | Secondary copy |
| `--text-3` | 6:1 | 5.1:1 | Tertiary labels |
| `--text-4` | 4:1 | 3.4:1 | **Large text only** (≥ 18px). Never body. |

### Semantic colours (use for meaning, never decoration)

| Role | Hex | Use |
|---|---|---|
| **Nova** (AI) | `#BF9FF1` | Purple — *only* for Nova-owned surfaces (AI badges, Nova pulse glow, AI trace lines) |
| Warning | `#F7C700` | Yellow — degraded state, requires attention |
| Danger | `#FF5757` | Red — failed, errored, destructive |
| Info | `#7193ED` | Blue — informational notices, metadata |

**Rule:** if a new feature wants to introduce a new colour, the answer is no. Differentiate with motion, light, or layout.

---

## Part 4 — Typography

Two voices. Each with a job.

### Geist Sans — the operator voice
- **When:** everything UI, body, labels, numbers, product copy
- **Weights:** 200–400. Never 500+. Display text is always 200 or 300.
- **Letter-spacing:** `-0.02em` on anything ≥ 1.5rem
- **Numbers:** always `font-variant-numeric: tabular-nums` so digits don't jitter
- **Source:** already loaded in `layout.tsx` as `var(--font-geist-sans)`

### System serif — the editorial voice
- **When:** hero moments only — landing H1, page titles, single-metric dashboards
- **Stack:** `ui-serif, 'New York', Iowan Old Style, Baskerville, Georgia, serif`
- **Why:** Apple's "New York" lives native on macOS/iOS — no font download, no cost. Falls back gracefully elsewhere.
- **How:** add `className="display-serif"` to any element that wants it
- **Use sparingly:** one serif moment per page. Not a paragraph, not a subhead. Just the headline.

### The Apple mix

| Surface | Voice |
|---|---|
| Landing hero H1 | Serif |
| Landing sub-hero, body | Sans |
| Product page titles | Either — pick once per section |
| Dashboard greeting | Sans |
| Big stat numbers | Sans (tabular) |
| Error messages | Sans |
| Pitch deck title slides | Serif |
| Pitch deck content slides | Sans |

### Scale

| Role | Class / size | Weight |
|---|---|---|
| Display (landing hero) | `text-4xl md:text-6xl` | 200 (extralight) |
| H1 (page title) | `text-2xl md:text-3xl` | 200 |
| H2 (section) | `text-lg md:text-xl` | 300 |
| Body | `text-sm` (14px) | 300 |
| Body small | `text-xs` (12px) | 300 |
| Eyebrow label | 10px, uppercase, `0.18em` letter-spacing | 400 — use `.eyebrow` |
| Stat number | 24–44px tabular | 200–300 — use `.stat-number` or `.stat-number-lg` |

---

## Part 5 — Logo & wordmark

### The wordmark: `GRID`

All caps. Geist Sans. Weight 200. Letter-spacing slightly wider than body for architectural feel.

**Minimum clear space:** 1× the cap height on all sides. Nothing touches it within that zone.

**Minimum size:** 32px on screen, 12pt in print. Below that it stops being legible.

### The mark (icon)

Three-panel glass icon — sits in the top-left of the product sidebar. SVG, pure geometric.

### What not to do

- Don't skew, rotate, or distort the wordmark
- Don't place on busy photography without a solid panel behind it
- Don't change "GRID" to "Grid" or "grid"
- Don't add taglines or punctuation to the mark itself
- Don't colour the wordmark anything other than: white, black, `--brand`, or `--text-1`

---

## Part 6 — Motion & light

Our motion vocabulary is Apple-restraint + environmental. Slow, tactile, premium. Nothing bouncy.

### Easings

| Use | Curve | Duration |
|---|---|---|
| Micro-interactions (hover, press) | `cubic-bezier(0.4, 0, 0.2, 1)` | 200ms |
| State changes (modal open, tab switch) | `cubic-bezier(0.4, 0, 0.2, 1)` | 400ms |
| Ambient drift (idle widgets) | `ease-in-out` | 6–42s |
| Pulse (live states) | `ease-in-out` | 3.2s cycle |
| Bounce | **banned** everywhere except scaffold-complete celebration |

### Motion primitives (available as CSS classes)

- `.drift` — slow sway (6s) for idle surfaces, hero cards
- `.aurora-pulse` — green halo breath for "live" states (Nova working, integration syncing) — replaces spinners
- `.flow-line` — thin current running left-to-right at the bottom of a processing surface — replaces spinners for long operations
- `.animate-fade-in` — 0.4s fade + slight y-translate for newly-revealed content

### Reduced motion

Everything above auto-disables on `@media (prefers-reduced-motion: reduce)`. Accessibility is non-negotiable.

### Depth & light

- **Glass panels** (`.glass`, `.glass-deep`): 40–80px backdrop blur, inset highlight on top edge, soft shadow below
- **Chrome buttons** (`.chrome`, `.chrome-pill`, `.chrome-circle`): neumorphic — Apple Vision Pro lineage. 0.5px translate on hover and press.
- **Status dots** (`.status-dot`, `.pulse`): 6px, rounded, one of the 4 semantic colours

Depth should feel **tactile**, like something you could almost press. Avoid Photoshop-style drop shadows without inset highlights.

---

## Part 7 — Imagery & photography

### Philosophy

GRID's visual identity is built on **environment**, not people. Our imagery references:

- Landscapes — horizons, atmospheric gradients, aurora, weather fronts
- Bioluminescence — moss under UV, deep sea plankton, sodium flares
- Wind farms / renewable energy — turbines spinning, fields of them
- Satellite views of organized natural systems — river deltas, coral reefs, terraced farms
- Apple Pro Display marketing shots — surfaces made of light, dark backgrounds with one bright element

### What NOT to use

- ❌ Stock photos of people in offices pointing at laptops
- ❌ Exploding 3D graphs, chart porn
- ❌ Handshake-and-skyscraper business imagery
- ❌ AI-generated people (uncanny valley erodes trust)
- ❌ Whimsical 3D isometric illustrations (this is not a DeFi app)
- ❌ Rainbow gradients, multi-colour palettes

### When to use actual photography vs. abstract

- **Landing page hero:** abstract environmental — bioluminescent macro shot, aurora time-lapse, dark satellite imagery
- **Product screenshots:** real UI captures, not mockups
- **Marketing email:** abstract texture as header band, never stock photos
- **Social posts:** product screenshot on black bg, or an environmental still with a single lime accent

### Product screenshot rules

1. Always on `#000000` background or a dark contextual frame
2. Never with confetti / sparkle overlays
3. Show real data when possible; if synthetic, make it specific and plausible ("Nicole", "Design Critique", "Q4 Budget Sync" — not "Lorem", "User 1", "Task 1")
4. Include the aurora-lime in frame — a button, a badge, a pulse
5. Keep one serif moment visible if it's a hero shot

---

## Part 8 — Layout & grid

### Desktop
- Max content width: **1280px** (`max-w-6xl`)
- Side padding: `px-4 md:px-10` (16px mobile, 40px desktop)
- Vertical rhythm: 16px, 24px, 40px, 64px — nothing else
- Border radius: 10 / 16 / 24 / 32 / pill. No other radii.

### Mobile
- One column. Always.
- Full-width cards with 16px padding
- Navigation collapses to bottom bar or hidden sidebar (never top-nav mega-menu)

### Grid for marketing
- 12 columns, 64px gutters on desktop
- 4 columns, 16px gutters on mobile
- Generous negative space — match Apple landing pages, not Shopify

---

## Part 9 — Marketing extensions

How the brand leaves the product and shows up elsewhere. The aesthetic must hold.

### Social media

**LinkedIn / X (Twitter):**
- Posts are black-background images (1200×630 LI, 1200×675 X) with one product screenshot OR one short quote set in serif
- Hook line in sans, lime accent on the key word
- Never >2 lines of body text in the image itself; long-form goes in the post body
- Headshots of founders: always shot against black or deep-charcoal, never office-stock

**Instagram:**
- Grid pattern: product shot → environmental still → quote card → product shot
- All 1:1 or 4:5 black-bg, lime accent somewhere in every frame
- Stories use `.flow-line` motion baked into short MP4 loops

### Pitch deck

- Cover slide: `GRID` wordmark (serif if title slide, sans elsewhere) on black, single aurora-lime accent line
- Section dividers: eyebrow label in lime, full-bleed black
- Data slides: tabular-nums, one stat per slide where possible, `.stat-number-lg` styling
- Charts: lime for positive, yellow for caution, red for decline. Never pie charts. Bar + line only.
- Typography: body 16pt Geist, headlines 32–48pt — one serif slide permitted per deck, usually the "why now" slide

### Email

**Transactional:**
- Plain-text-feel HTML. Black bg, white text, one lime CTA button (pill, `--brand-soft` fill, `--brand` text, `--brand-border` border).
- No logo in header — just the word "GRID" at top-left, Geist 200, letter-spacing `0.1em`.
- Footer: `support@grid.systems` + one-line address + `grddd.com/privacy` link.

**Newsletter / product update:**
- Serif headline at top
- Sans body
- Max 3 sections per email
- Screenshots embedded on black cards with 16px padding
- Signature in Nicole's voice, first-person singular. No "Cheers, the GRID team" — it's honest and small.

### Blog / editorial

- Every post has one hero moment: either a serif pull-quote or a full-bleed environmental image with lime accent
- Body sets in Geist 300 at 17–18px for comfortable reading
- Code blocks: Geist Mono, `#060608` background, syntax-highlight with the semantic palette (lime for keywords, purple for strings, yellow for numbers)
- Post length: 600–1500 words. Short essays, not SEO doorstops.

### Ads

- **Display ads (IAB):** black bg, wordmark top-left, one-sentence headline centred, lime CTA bottom-right. No product screenshot unless full-width.
- **Video ads (short-form):** 15s max. Open on environmental footage (aurora, wind turbines, moss macro), resolve to a product screenshot, end on wordmark + URL. No voiceover — sub-titles only.
- **Podcast / audio reads:** Nicole's voice, founder-direct. No jingle.

### Swag

- T-shirt: black, wordmark centre-chest in lime (pantone-match to #C8F26B). Nothing else.
- Sticker: 2" circle, black bg, lime wordmark, thin lime outer ring
- Notebook: black cover, lime bind, wordmark debossed top-right
- Never put the full tagline on swag. Just the mark.

### Event / trade show booth

- Black backdrop, one 5ft wordmark in lime, one screen showing the product
- No collateral pile — one 6-page pitch folio in the editorial voice, handed to qualified leads only
- Booth staff: black shirts, no branded lanyards

---

## Part 10 — The Do/Don't quick card

### Do
- ✅ Use the aurora-lime as the ONE accent
- ✅ Use serif for hero moments, sans everywhere else
- ✅ Write errors like editorial — what/why/what-next
- ✅ Maintain ≥ 4.5:1 contrast for body text
- ✅ Respect `prefers-reduced-motion`
- ✅ Show real data in product screenshots
- ✅ Leave generous negative space
- ✅ Ship "it's not ready yet" honestly

### Don't
- ❌ Add a second accent colour to "differentiate a feature"
- ❌ Use stock photos of people
- ❌ Use emojis in product UI (ok in blog / social tone where appropriate)
- ❌ Use bouncy / spring easings
- ❌ Capitalise as "Grid" or "grid"
- ❌ Use exclamation points in marketing
- ❌ Ship "coming soon" buttons that fire toasts
- ❌ Use weight 500+ for display text
- ❌ Add drop shadows without inset highlights
- ❌ Ever use Comic Sans, Papyrus, or any other joke font (it has happened, we are not safe)

---

## Part 11 — Tagline bank

**Primary (use this 90% of the time):**
> AI that watches your business and runs better versions for you.

**Short variants (for social, swag, ads):**
- AI that runs your operations.
- The operational layer.
- Your business, better versions.
- AI. Your keys. Your ops.

**Long variants (for pitch decks, about pages):**
- Most AI tools wait for you to ask. GRID watches, learns, and runs better versions for you.
- Connect your tools. GRID maps your operations, runs workflows, and gets better every time you accept or reject an output.

**Don't use:**
- ~~"AI-powered operations platform"~~ (sounds like every other SaaS)
- ~~"The future of work is here"~~ (has been "here" for 20 years)
- ~~"Unlock your team's potential"~~ (we don't lock things)

---

## Part 12 — Governance

### Who approves a new brand surface
For now: **Nicole.** This is a one-person design org until it isn't. Any external deliverable (ad, pitch deck, press image) goes through her before it ships.

### Where the assets live
- **Tokens:** `app/globals.css` (single source of truth for colours, spacing, motion)
- **Logo SVG:** `public/brand/grid-wordmark.svg` (TODO: export if not already present)
- **Screenshot templates:** Figma file `GRID — Marketing` (TODO: set up)
- **This doc:** `docs/BRAND_GUIDELINES.md` in the repo

### When this doc changes
Version-bump the top of the file. Add a line at the bottom of this section noting what changed and why. Don't silently edit tokens — they're referenced across 100+ files.

### Changelog
- **v1.0** (April 2026) — Initial brand guidelines. Establishes aurora-lime as the single accent, crisp black as the surface, Geist + system serif as the typographic pair, environmental/Apple-restraint as the motion-and-imagery principle. Locks voice rules (no exclamation points, no marketing fluff, "GRID" always uppercase). Adds marketing extensions for social, pitch deck, email, blog, ads, swag, events.

---

*When in doubt, choose the quieter option. GRID is not trying to be noticed — it's trying to be inhabited.*
