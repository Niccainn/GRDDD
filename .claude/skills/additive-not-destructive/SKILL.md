---
name: additive-not-destructive
description: Use this skill when reviewing or proposing any PR that deletes more than ~50 lines of user-visible UI, removes a route, or "cleans up" a surface. Enforces the CLAUDE.md tenet that rewrites which clear what a user sees are a failure mode — every removal needs a forwarding path or explicit founder sign-off.
---

# Skill: additive-not-destructive

## When to invoke

- A PR deletes > 50 lines from `app/**` or `components/**` (user-visible)
- A route is being removed (`app/<something>/page.tsx` deleted)
- "Tech debt cleanup" / "remove the old X" PRs
- Refactor that "simplifies" by removing a surface
- Reviewing any diff with a large red (deletion) block in UI files

## The tenet (CLAUDE.md, verbatim)

> **Additive, not destructive.** New features layer onto existing surfaces. Rewrites that clear what a user sees are a failure mode.

> Don't restructure the app's major layout without explicit approval. Add, rename, and wire. Don't move.

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Quantify the deletion
git diff --stat origin/main...HEAD -- 'app/**' 'components/**' | tail -5

# 2. For each deleted UI file/block, answer:
#    a) Is the surface MIGRATED somewhere else (additive replacement)?
#       → e.g., old /dashboard widget moved into new /overview — OK
#    b) Is there a FORWARDING PATH (redirect, link, feature-flagged toggle)?
#       → e.g., /old-route now 301s to /new-route — OK
#    c) Did the founder EXPLICITLY OK the removal?
#       → cite the message — OK
#    d) None of the above?
#       → BLOCK. This violates the tenet.

# 3. Check for inbound links to a deleted route
grep -rn "<deleted-route>" app/ components/ --include="*.tsx"
# Any internal link to a now-deleted route = broken nav

# 4. Check sitemap / robots / external surface
grep -rn "<deleted-route>" app/sitemap.ts app/robots.ts public/ 2>/dev/null
```

## Verification

A destructive change is acceptable ONLY if one of:

- **Migrated**: the UI exists on another surface (show where)
- **Forwarded**: a redirect/link preserves the entry point (show the redirect)
- **Founder-approved**: explicit sign-off quoted in the PR description
- **Never-shipped**: the deleted code was behind a flag that was never on in production (verify the flag history)

Otherwise: block the PR, propose the additive alternative (feature-flag the old surface, add a redirect, keep a link).

## Failure modes

- **"Nobody uses this"** without data — in beta with few users, usage is invisible, not zero. Default to additive unless there's a forwarding path.
- **Route deletion breaks deep links** — bookmarks, shared URLs, search-indexed pages, external references. A 301 redirect is cheap insurance.
- **Component deletion breaks a consumer you didn't grep for** — dynamic imports, string-based component resolution, MDX. Grep broadly.
- **"Refactor" that's actually a rewrite** — CLAUDE.md: "Add, rename, and wire. Don't move." Renaming a file is fine; relocating a surface so users can't find it is not.
- **Sitemap drift** — deleted route still in `app/sitemap.ts` → 404s indexed by search engines. Update sitemap in the same PR.
- **The exception that proves the rule** — sometimes removal IS correct (a genuinely abandoned never-shipped prototype). The skill doesn't forbid removal; it forces the justification to be explicit.

## Owner

`engineer + growth` (engineer checks the code paths; growth/brand-ops checks the user-visible impact)
