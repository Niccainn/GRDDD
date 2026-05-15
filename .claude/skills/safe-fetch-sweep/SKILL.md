---
name: safe-fetch-sweep
description: Use this skill when adding any client-side `fetch()` call in `app/` or `components/`, when reviewing PRs that add fetches, or as a periodic sweep of bare `.then(r => r.json())` patterns. Replaces unsafe fetch with `safeFetch` helper that validates response shape with zod — preventing the entire class of "API returned wrong shape, component crashes" bugs that PR #33 caused.
---

# Skill: safe-fetch-sweep

## When to invoke

- Adding a new `fetch(...)` in `app/**/*.tsx` or `components/**`
- Reviewing PR that adds client fetches
- Periodic: monthly grep + sweep
- Post-incident if a "cannot read property X of undefined" trace points at a fetch boundary

## The pattern

`lib/api/safe-fetch.ts` exports `safeFetch<T>(url, schema)` that:
- Fetches the URL
- Validates the response with the provided zod schema
- Throws a typed error on shape mismatch (instead of letting `undefined` propagate)
- Logs the mismatch to telemetry so you see it in Sentry

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Grep for unsafe pattern in client code
grep -rn "fetch(" app/ components/ --include="*.tsx" --include="*.ts" | \
  grep -v "node_modules" | \
  grep -v "import" | \
  grep -v "/api/" | \
  grep -E '\.then\(.*=>.*r\.json\(\)|await.*\.json\(\)'

# 2. For each hit, replace with safeFetch
# OLD:
#   const data = await fetch('/api/foo').then(r => r.json());
#
# NEW:
#   import { safeFetch } from '@/lib/api/safe-fetch';
#   import { z } from 'zod';
#
#   const FooSchema = z.object({ id: z.string(), name: z.string() });
#   const data = await safeFetch('/api/foo', FooSchema);

# 3. If no schema exists for the response, write one inline.
#    Look at the API route's return type if it's typed there.

# 4. Add a unit test for the new schema (optional but recommended)
```

## Verification

After sweep:
- `grep` returns zero unsafe `.json()` calls in `app/` and `components/`
- Each safeFetch call has a real zod schema (not `z.any()`)
- Build passes (`npm run build`)
- New schema covers the actual response shape (manually verify against API route)

## Failure modes

- **Server components don't need safeFetch** — they're already in a try/catch context (Next App Router error boundary). Filter: only sweep client components (`'use client'`) and event handlers.
- **Third-party APIs without stable shape** — use `z.passthrough()` with a runtime warning rather than skipping validation entirely.
- **Optional fields** — `z.object({ id: z.string() }).strict()` rejects extra fields; use without `.strict()` for forward-compat.
- **Streaming responses** (SSE, chunked) — safeFetch is for JSON. For streams, validate per-chunk with a different helper.
- **POST/PUT/DELETE** — safeFetch typically targets GETs. For mutations, validate the *response* but the *request body* is your own — type it at the source.

## Owner

`engineer`
