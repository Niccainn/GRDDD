---
name: idor-audit
description: Use this skill any time a new tenant-owned API route is added (`app/api/[entity]/[id]/route.ts`), any new `findUnique({ where: { id } })` is introduced, or as a periodic sweep of all such patterns. Verifies every fetch + mutation enforces ownership of the resource by the requesting tenant — preventing IDOR (Insecure Direct Object Reference) leaks.
---

# Skill: idor-audit

## When to invoke

- Adding `app/api/<entity>/[id]/route.ts` for any new resource type
- Adding `prisma.X.findUnique({ where: { id } })` or `findFirst({ where: { id } })`
- Adding `prisma.X.update({ where: { id } })` or `delete({ where: { id } })`
- Periodic sweep (monthly): grep the codebase, audit every match
- After a security-related PR (e.g., PRs #57-#59, #68, #69 were all this pattern)

## The pattern (canonical)

`lib/auth/ownership.ts` provides `assertOwnsX` helpers. Every read or write of a tenant resource must:

```ts
// PATTERN: assert ownership BEFORE returning data
const identity = await getAuthIdentityOrNull();
if (!identity) return Response.json({ error: 'unauthorized' }, { status: 401 });

const resource = await prisma.thing.findUnique({
  where: {
    id,
    // CRITICAL: include tenant scope in the WHERE clause
    environment: { ownerId: identity.id }
  },
});

if (!resource) return Response.json({ error: 'not found' }, { status: 404 });
// (returning 404 instead of 403 prevents tenant enumeration)
```

OR use the helper:

```ts
const resource = await assertOwnsThing(id, identity.id);
// Throws Response on mismatch — wrap in try/catch in App Router
```

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Find all findUnique / findFirst calls that fetch by `id`
echo "=== fetches by id (audit each for adjacent ownership check) ==="
grep -rn "findUnique\|findFirst" lib/ app/ --include="*.ts" --include="*.tsx" | \
  grep -E "where:.*\{.*id:" | \
  grep -v "__tests__" | \
  grep -v "/scripts/"

# 2. Find all update/delete calls (mutations need same check)
echo "=== mutations by id ==="
grep -rn "\.update\(\{ where: \{ id\|\.delete\(\{ where: \{ id" lib/ app/ \
  --include="*.ts" --include="*.tsx" | grep -v "__tests__"

# 3. For each hit, manually verify either:
#    a) The where clause includes a tenant filter (environmentId, ownerId, accountId)
#    b) The line above calls assertOwnsX(id, identity.id)
#    c) The route is intentionally public (rare — must be documented)

# 4. Look for routes that bypass the audit pattern entirely
echo "=== routes that don't call getAuthIdentityOrNull ==="
for f in $(find app/api -name "route.ts" -not -path "*/auth/*" -not -path "*/cron/*"); do
  if ! grep -q "getAuthIdentity\|assertOwns" "$f"; then
    echo "  $f — no auth check found (verify intentional)"
  fi
done
```

## Verification

For each hit from step 1-2, the line context must show:

- **Tenant filter in WHERE** (`environment: { ownerId: identity.id }`, or similar nested check), OR
- **`assertOwnsX(id, identity.id)` call** above the fetch, OR
- **Comment marking it intentionally public** (`// PUBLIC: this resource is accessible to any signed-in user`) AND the route is not for a tenant resource

Anything else = IDOR vulnerability. Fix immediately.

## Failure modes

- **Nested `include` leaks adjacent tenant data** — e.g., `prisma.environment.findFirst({ include: { systems: { include: { workflows: true } } } })` may return workflows from other environments if the join isn't scoped. Audit the includes too.
- **`findFirst` is just as risky as `findUnique`** — both can be IDOR'd. Same audit applies.
- **Race condition between check and write** — if you `assertOwns` then `update` in two queries, ownership could change between. Use `prisma.$transaction` or include the tenant filter directly in the `update` WHERE.
- **Public + private mix** — a route that serves both anonymous + authenticated requests is high-risk. Better: separate routes per audience.
- **Cron / webhook routes** — these bypass per-user auth by design. Verify they have other guards (HMAC signature, allow-list IP, etc.).
- **Prisma extensions on shared client** — `lib/db.ts` extensions apply to all queries; verify they don't bypass security somewhere.

## Owner

`engineer` (security audit pattern; brand-ops doesn't review this — it's not user-visible)
