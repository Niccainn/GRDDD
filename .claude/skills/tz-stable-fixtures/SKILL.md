---
name: tz-stable-fixtures
description: Use this skill when writing or reviewing any test that constructs Date objects or asserts on calendar days. Pins date fixtures to 12:00 UTC — the only hour that stays on the same calendar day in every IANA timezone — so the test doesn't pass on the author's machine and fail in CI or on a teammate in Asia/Tokyo.
---

# Skill: tz-stable-fixtures

## When to invoke

- Writing a new test in `__tests__/**` that touches `Date`, calendar days, "today", date bucketing, scheduling
- Reviewing a PR that adds date-based tests
- A test passes locally but fails in CI (classic TZ symptom)
- Post-incident: a date test flaked (the calendar-buckets bug — UTC fixture at 15:00 landed on the next day in Asia/Tokyo, +9)

## The rule

**All date-string fixtures use `T12:00:00Z`.** Noon UTC is the only hour that maps to the same calendar date in every timezone (UTC-12 through UTC+14).

```ts
// WRONG — crosses day boundary in some zones:
const events = [
  { id: 'a', date: '2026-04-03T00:00:00Z' },  // → Apr 2 in UTC-anything
  { id: 'b', date: '2026-04-03T15:00:00Z' },  // → Apr 4 in Asia/Tokyo (+9)
  { id: 'c', date: '2026-04-03T23:00:00Z' },  // → Apr 4 east of UTC+1
];

// RIGHT — stable everywhere:
const events = [
  { id: 'a', date: '2026-04-03T12:00:00Z' },
  { id: 'b', date: '2026-04-03T12:00:00Z' },
  { id: 'c', date: '2026-04-10T12:00:00Z' },
];
```

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Find date fixtures NOT at noon UTC in test files
grep -rnE "T(00|01|02|03|04|05|06|07|08|09|10|11|13|14|15|16|17|18|19|20|21|22|23):[0-9]{2}:[0-9]{2}Z" \
  __tests__/ --include="*.ts" | grep -iE "date|fixture|event|created|2026|2025"

# 2. For each, change the time component to T12:00:00Z (keep the date)
#    unless the test SPECIFICALLY asserts on time-of-day (rare — comment it if so)

# 3. Run the test under two extreme timezones
TZ=Asia/Tokyo        npx vitest run <test-file>
TZ=America/Los_Angeles npx vitest run <test-file>
TZ=Pacific/Kiritimati  npx vitest run <test-file>   # UTC+14, the extreme
# All three must pass identically.
```

## Verification

- No date fixture in `__tests__/**` uses an hour other than `12` UTC (except tests deliberately about time-of-day, which carry a `// TZ-intentional` comment)
- The target test passes under `TZ=Asia/Tokyo`, `TZ=America/Los_Angeles`, and `TZ=Pacific/Kiritimati`
- CI passes (CI runner TZ is usually UTC, which masks the bug — local-vs-CI divergence is the tell)

## Failure modes

- **`new Date('2026-04-03')`** (no time) — parsed as UTC midnight, then `.getDate()` in local time can be the 2nd or 3rd. Always include explicit `T12:00:00Z`.
- **`Date.UTC()` vs `new Date()`** — `Date.UTC(2026, 3, 3)` is a timestamp; `new Date(2026, 3, 3)` is local-time. Mixing them in assertions is a subtle bug.
- **Function under test uses local time intentionally** — calendar UIs render in the user's zone, so the *function* may correctly use `.getDate()` (local). The fix is the test FIXTURE (use noon), not the function. Don't "fix" correct local-time logic.
- **CI masks it** — CI containers usually run UTC, so the bug only shows on a developer machine east of UTC. "Works in CI, fails for me" is the signature.
- **Snapshot tests with dates** — serialised dates in snapshots embed the runner's TZ. Freeze time (`vi.setSystemTime`) AND use noon fixtures.

## Owner

`engineer`
