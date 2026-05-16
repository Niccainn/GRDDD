---
name: seo-pass
description: Use this skill when adding or revising a public marketing route — technical + on-page SEO check (metadata, JSON-LD, sitemap, headings, internal links, performance signals) so a new page is actually discoverable, not just live.
---

# Skill: seo-pass

## When to invoke

- A new marketing route shipped (`/use-cases/*`, `/compare/*`, `/blog/*`)
- Home or `/pricing` substantially revised
- Sitemap/robots touched
- A `marketing-feedback-loop` finding cites discoverability

## Procedure

```
1. Metadata — the route exports a Next Metadata object:
   - title (unique, < 60 chars, no banned words, GRID uppercase)
   - description (< 155 chars, concrete, the page's one job)
   - openGraph + twitter card present
   Check: grep the route for `export const metadata` / generateMetadata.

2. Structured data — appropriate JSON-LD where it helps
   (SoftwareApplication on home/pricing already exists in app/page.tsx;
   Article on blog posts). Don't over-mark.

3. Headings — exactly one <h1>, logical h2/h3 nesting, the h1 carries
   the page's primary phrase.

4. Sitemap — new route is in app/sitemap.ts. Deleted route is NOT
   (stale sitemap entries 404 in the index — additive-not-destructive
   skill cross-check).

5. Internal links — the new page is reachable from at least one
   existing nav/footer/related surface (orphan pages don't rank).

6. Performance signals — no layout-shift on hero, fonts use the
   existing next/font setup (no new web-font cost), images sized.
   Lighthouse CI already runs on PRs — read its output, don't re-run.

7. Output a checklist pass/fail. File any fail as a
   marketing-feedback-loop finding routed to engineer (advisory).
```

## Verification

- `metadata` present + within length limits + on-voice
- One h1, clean heading tree
- Route in `app/sitemap.ts`; no deleted routes lingering there
- Reachable via ≥ 1 internal link
- Lighthouse CI green on the PR (read it, don't fabricate a score)

## Failure modes

- **Title/description banned words or "Grid"** — SEO surfaces are shipped copy; voice rules apply. Run `voice-check`.
- **Orphan page** — live but unlinked = effectively invisible. Must have an inbound internal link.
- **Stale sitemap** — deleting a route but leaving it in sitemap.ts → indexed 404s. Pair with `additive-not-destructive`.
- **Keyword stuffing** — violates CLAUDE.md voice. Write for the operator, not the crawler; the crawler rewards clarity now anyway.
- **Inventing Lighthouse numbers** — CI produces the real one; cite it or say "pending CI".

## Owner

`growth` (fails route to `engineer` via the loop)
