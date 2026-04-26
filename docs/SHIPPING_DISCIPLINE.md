# Shipping discipline

This document explains the safeguards in the repo that prevent the
"silent build failure" class of bug we hit on 2026-04-26 (PRs #39–#42
all failed to deploy because Vercel build status wasn't surfaced as a
required PR check).

## What's automated

### Pre-push type check (.githooks/pre-push)

Before any `git push`, the hook runs:

1. `prisma generate` — sync extended-client types
2. `tsc --noEmit` — catch type errors locally

Catches the same errors Vercel's `next build` will catch, with a ~10-second
local feedback loop instead of a remote build cycle. Activated automatically
on `npm install` via the `prepare` script.

To bypass for genuine emergencies: `git push --no-verify`. Don't.

### ESLint rule against unguarded fetch parsing

`eslint.config.mjs` contains a `no-restricted-syntax` rule that errors
on the pattern:

```ts
fetch(url).then(r => r.json()).then(d => setX(d));
```

This shape crashes on any non-2xx, malformed JSON, or shape mismatch.
Use `fetchArray` / `fetchObject` / `safeFetch` from
[`lib/api/safe-fetch.ts`](../lib/api/safe-fetch.ts) instead.

The helper file itself is whitelisted because it legitimately calls
`r.json()` inside `.then()`.

## What needs manual setup (one-time)

### Vercel as a required GitHub check

The Vercel build status is reported as a deployment via the
GitHub Deployments API, but **does not surface as a PR status check by
default**. This is why PRs #39–#42 merged green even though Vercel was
failing every build for 30+ minutes.

To make a failed Vercel build block the merge button:

#### Step 1 — Vercel project settings

1. Go to <https://vercel.com/grdlbs/grddd/settings/git> (or your
   project's git settings)
2. Find **"Production Deployments / Required deployments before merge"**
3. Toggle it on for the production environment
4. Repeat for the `grid` project at `vercel.com/grdlbs/grid/settings/git`

#### Step 2 — GitHub branch protection

1. Go to <https://github.com/Niccainn/GRDDD/settings/branches>
2. Add or edit a branch protection rule for `main`
3. Under **"Require status checks to pass before merging"**:
   - Enable the toggle
   - Search for `Vercel` (or `Vercel — grddd`, `Vercel — grid`)
   - Add both checks
   - Save

After this is done, GitHub will show a red X next to the merge button
on any PR with a failing Vercel build, and the merge button will be
disabled until the build passes.

#### Cost

Free for the team plan. No additional Vercel cost — the integration
is built in.

## Why this matters

Without these guards, the failure mode that hit us was:

1. PR #39 merges → Vercel build fails silently → main goes orange in deploys API
2. PR #40 merges → builds against #39's bad state → also fails
3. PR #41 merges → still failing
4. PR #42 merges with the actual fix → builds clean → finally deploys all four PRs together

By the time the user noticed, three production deploys had been blocked
for 30+ minutes and the user-facing flow was broken. The pre-push hook
+ required check would have stopped this at PR #39, before #40, #41,
#42 even got authored.
