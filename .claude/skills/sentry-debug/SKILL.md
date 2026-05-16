---
name: sentry-debug
description: Use this skill when Sentry shows zero events despite the SDK appearing wired, when the onboarding wizard sits at step 1, when adding/upgrading `@sentry/nextjs`, or when "DSN seems set but bundle is empty". Verifies env vars are populated, the right config files exist for the SDK version, and the SDK is actually in the production bundle.
---

# Skill: sentry-debug

## When to invoke

- "No Sentry events arriving from prod"
- Sentry onboarding wizard stuck at step 1 (`guidedStep=1`)
- `vercel env pull` shows Sentry envs as `KEY=""` (empty)
- After upgrading `@sentry/nextjs` (v8 → v9 → v10 each had filename changes)
- Bundle-scan returns zero `@sentry` symbols when DSN appears set

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Verify all 5 envs set + non-empty
vercel env pull /tmp/_pe --environment=production --yes
for k in NEXT_PUBLIC_SENTRY_DSN SENTRY_DSN SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  v=$(grep "^${k}=" /tmp/_pe | cut -d= -f2- | sed 's/^"//;s/"$//')
  echo "  $k: ${#v} chars"
done
rm -f /tmp/_pe
# Expected: all > 0. Empty = use vercel-env-bulk skill to set.

# 2. Verify required config files exist (per @sentry/nextjs v10)
ls -la instrumentation.ts instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts 2>&1
# Expected: all 4 present. instrumentation-client.ts is REQUIRED for v10+;
# sentry.client.config.ts alone is silently ignored.

# 3. Confirm wrapping in next.config.ts
grep -A 5 "withSentryConfig" next.config.ts
# Expected: withSentryConfig(...) wrapping the export, gated on SENTRY_DSN + SENTRY_AUTH_TOKEN both present.

# 4. Force a clean redeploy (build cache may have cached pre-env state)
vercel deploy --prod --force --yes
# Wait for "● Ready", note the URL

# 5. Bundle-scan grddd.com for SDK symbols
curl -sL "https://grddd.com/?cb=$(date +%s)" -H "Pragma: no-cache" -o /tmp/_h.html
chunks=$(grep -oE "_next/static/chunks/[^\"]+\.js" /tmp/_h.html | sort -u)
hits=0
while IFS= read -r c; do
  if curl -s "https://grddd.com/${c}" | grep -qE "ingest\.[a-z]+\.sentry\.io|@sentry|Sentry\.init|captureException"; then
    hits=$((hits+1))
  fi
done <<< "$chunks"
echo "sentry-bearing chunks: $hits"
rm -f /tmp/_h.html

# 6. If 0 chunks contain Sentry, fire a test event from devtools console
#    Open https://grddd.com → DevTools → Console → run:
#    Sentry.captureMessage('grid first ping', 'info')
#    OR force an exception:
#    throw new Error('grid sentry test ' + Date.now())

# 7. Check Sentry dashboard — event should arrive within 30s
#    https://grddd.sentry.io/issues/?project=4511340235980801
```

## Verification

Pass = all of:
- All 5 envs have non-zero length
- `instrumentation-client.ts` exists at root (NOT just `sentry.client.config.ts`)
- `withSentryConfig` wraps in `next.config.ts`
- Bundle scan returns ≥ 1 chunk with Sentry symbols
- Test event from console reaches Sentry dashboard within 30s

## Failure modes

- **Legacy `sentry.client.config.ts` only** — @sentry/nextjs v9+ silently ignores it. Symptom: env set, build engages plugin (deprecation warnings fire), but bundle has no SDK. Fix: create `instrumentation-client.ts` re-exporting the legacy file (PR #81 pattern).
- **Build cache hides env-var changes** — even after env update, build cache serves stale chunks. Always `--force` the deploy.
- **Preview-only env scope** — vars must include `production` scope; `preview` alone won't reach prod. Verify with `vercel env ls`.
- **DSN inlined as empty string** — `if (process.env.NEXT_PUBLIC_SENTRY_DSN) { Sentry.init() }` — webpack tree-shakes the entire init when DSN is empty at build time. Set the env BEFORE the build.
- **`Sentry is not defined` in console** — SDK didn't attach to `window`. Use `import('@sentry/nextjs').then(s => s.captureMessage(...))` instead.
- **Auth token wrong scopes** — sourcemap upload silently skips if token lacks `project:releases` + `project:write`. Build still succeeds. Verify in Sentry → Org Settings → Developer Settings → Organization Tokens.

## Owner

`operator`
