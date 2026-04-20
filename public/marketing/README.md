# GRID — Marketing mockups

10 pixel-perfect mockup screenshots at **1920×1080** (16:9, 1080p), generated
directly from brand tokens — same `#000000`, same `#C8F26B`, same type stack
as the live product.

## What each one is for

| File | Scene | Best for |
|---|---|---|
| `png/grid-mockup-01.png` | **Hero / positioning**: giant serif headline, early-access badge, pull quote | Landing above-the-fold, pitch deck cover, LinkedIn header, X pinned post |
| `png/grid-mockup-02.png` | **Dashboard greeting**: "Good afternoon, Nicole" with 3 stat cards, recent runs, attention panel | About page, "the product" slide in a deck, product-page marquee |
| `png/grid-mockup-03.png` | **Live scaffold streaming**: "Nova is assembling" with organelles streaming in | Feature post about one-prompt workspace generation, demo day, Show HN hero |
| `png/grid-mockup-04.png` | **Workflow in motion**: 5-stage execution with confidence chips, critic pending, per-stage inputs | Pitch deck "how it works" slide, technical deep-dive blog post |
| `png/grid-mockup-05.png` | **The metacognition layer**: Nova draft + accept/iterate/reject | The single most important marketing shot — feedback loop as product |
| `png/grid-mockup-06.png` | **Integrations grid**: 12 live providers with sync status | "Works with your stack" slide, integrations page hero, partner materials |
| `png/grid-mockup-07.png` | **Calendar layered**: Tasks + Goals + Nova + Google Calendar overlaid | Calendar feature page, demo video opener |
| `png/grid-mockup-08.png` | **Ambient inbox**: sources sidebar + signal feed | "Everything worth knowing" feature post, operator-persona marketing |
| `png/grid-mockup-09.png` | **Value meter**: giant `15.1 hours` with per-week breakdown | Weekly digest email header, retention marketing, user-success quote card |
| `png/grid-mockup-10.png` | **System detail**: per-system agent + autonomy tier + learned insights | Investor deck, "how the system compounds" slide |

## How to regenerate

```bash
# From repo root
cd public/marketing/mockups
bash render.sh
```

The script:
1. Uses headless Chrome to render `mockups.html` to a single tall PNG (1920×10800)
2. Slices that into 10 × 1920×1080 PNGs via Python PIL (macOS default)

## How to edit

Open `mockups/mockups.html` in any browser. Each `<section class="shot sN">`
is exactly one 1920×1080 frame. Brand tokens are the same `:root` variables
as the live product — changing the CSS here mirrors what users see.

Fonts: system stack (`-apple-system`, Helvetica Neue, Inter) for sans;
`ui-serif, 'New York', Iowan Old Style, Baskerville` for display moments.
No external font downloads — renders identically offline.

## Usage notes

- **Lossless reuse**: these are PNGs not JPGs — use them in pitch decks,
  Figma, Keynote, InDesign without quality loss
- **Resize with care**: at 1920×1080 they're sharp at any display size up to
  4K; downscaling is fine, upscaling softens the type
- **Export variants**: need 1200×630 for social? Crop + scale in Figma.
  Need square for Instagram? The hero slide (#1) and value meter (#9)
  work in 1:1 with minor recomposition.

## Locked tokens (don't drift)

```
--bg         #000000   (pure crisp black)
--brand      #C8F26B   (aurora-lime, the single accent)
--brand-soft rgba(200,242,107,0.12)
--nova       #BF9FF1   (Nova purple — only on Nova surfaces)
--text-1     rgba(255,255,255,0.95)
--text-2     rgba(255,255,255,0.72)
--text-3     rgba(255,255,255,0.55)
```

See `docs/BRAND_GUIDELINES.md` v1.0 for the full spec.
