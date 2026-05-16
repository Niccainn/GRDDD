---
name: verify-deploy
description: Use this skill when checking whether a code change is actually live on grddd.com — after `vercel deploy --prod`, after a PR merge, when a user reports "is X live yet", or when something looks deployed but feels off. Confirms the running build is the one you expect by cache-busting CDN, comparing deployment URL to git HEAD, and grepping the bundle for known new content.
---

# Skill: verify-deploy

## When to invoke

- After `vercel deploy --prod --force --yes` returns a URL
- After a PR merge to `main` (Vercel auto-deploys; you confirm it landed)
- "Is X live yet?" — any version of that question
- Diagnosing "I deployed but the change isn't visible"
- Pre-launch checklist: confirm the build serving traffic is the build you intended

## Procedure

```bash
# 1. Confirm git HEAD locally — what you expect to be live
EXPECTED_SHA=$(git rev-parse origin/main | head -c 7)
echo "Expected HEAD: $EXPECTED_SHA"

# 2. Check the latest Vercel production deployment
cd /Users/nc/projects/grid
vercel ls --prod 2>&1 | head -5
# Note the most-recent "Ready" deployment URL (grid-XXXXX-grdlbs.vercel.app)
# AND the duration (long duration = real build, not cached)

# 3. Cache-bust grddd.com — the alias may serve stale HTML for up to 6h
curl -sL "https://grddd.com/?cb=$(date +%s)" \
  -H "Pragma: no-cache" \
  -H "Cache-Control: no-cache" \
  -o /tmp/_index.html
AGE=$(curl -sI "https://grddd.com/" | grep -i "^age:" | awk '{print $2}' | tr -d '\r')
echo "CDN age: ${AGE:-0}s (>3600 means stale)"

# 4. Bundle scan — find chunks loaded by the home page, look for the new content
EXPECTED_STRING="<a known string from your latest change>"  # SET THIS PER VERIFICATION
chunks=$(grep -oE "_next/static/chunks/[^\"]+\.js" /tmp/_index.html | sort -u)
hits=0
while IFS= read -r c; do
  body=$(curl -s "https://grddd.com/${c}")
  if echo "$body" | grep -q "$EXPECTED_STRING"; then
    hits=$((hits+1))
  fi
done <<< "$chunks"
echo "Chunks containing expected content: $hits"

rm -f /tmp/_index.html
```

## Verification

The change is live iff ALL of:

- Latest deployment shows `● Ready` in `vercel ls --prod`
- CDN `age` < 600s (cleared cache reaches the new build) — or trigger a hard refresh
- At least one chunk contains the expected content string
- For Sentry/SDK changes: bundle includes `@sentry|ingest.*sentry.io|Sentry.init`
- For UI text changes: HTML or chunk contains the new copy

Verbal sign-off: "Deploy `<sha>` is live on grddd.com, age `<n>s`, expected content in `<n>` chunks."

## Failure modes

- **Stale CDN** — `age > 21600` (6h+) means the alias hasn't promoted. Check `vercel inspect <url>` for alias state. May require explicit `vercel alias` command.
- **Stale checkout deploy** — `vercel deploy` from `/Users/nc/projects/grid/` deploys whatever's checked out THERE, not main. Run `git status && git log --oneline -1` from that dir before trusting the deploy.
- **Build cache hides env-var changes** — even after env update, cached build serves stale chunks. Use `--force` to skip cache.
- **Wrong project** — `vercel ls` lists deployments for the linked project. If `.vercel/project.json` points at the wrong project, you'll deploy somewhere harmless.
- **Two projects on same domain** — there's an old `grddd` project alongside the active `grid` project. Confirm `grddd.com` alias is on `grid` via `vercel domains inspect grddd.com`.
- **Empty bundle scan** = SDK got tree-shaken (env not set at build time) OR you're scanning the wrong chunks. Verify with `vercel env pull --environment=production` length checks first.

## Owner

`operator` (deploy verification is operational — engineer runs it via this skill but operator owns the procedure)
