---
name: plan-rename
description: Use this skill when changing the user-visible label of a billing plan ("rename Pro to Studio", "rename Team to Business"). Keeps internal IDs (`FREE | PRO | TEAM`) stable so DB rows, Stripe metadata, and audit logs don't need migration; only `PLANS[id].name` and optionally `description` change.
---

# Skill: plan-rename

## When to invoke

- "Rename Pro to X"
- Marketing wants a new label for an existing tier
- Edit to `lib/billing/plans.ts:name` field
- A/B testing different plan names

## DO NOT invoke for

- **Adding a new tier** — that's a new SKU, requires Stripe Product + Price + DB enum migration. Not this skill.
- **Reordering tiers** — changes pricing-page order, but if internal IDs stay, this skill applies for the labels only.
- **Changing prices** — that's a finance + Stripe-side change, separate skill flow.

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Identify which internal ID to rename
#    FREE → currently displayed as "Operator"
#    PRO  → currently displayed as "Team"
#    TEAM → currently displayed as "Enterprise"
#    (See lib/billing/plans.ts header comment)

# 2. Edit ONLY the display fields in lib/billing/plans.ts
#    Change PLANS[id].name + optionally PLANS[id].description
#    DO NOT change PlanType enum, PLANS[id].id, or any internal references

# 3. Verify nothing else references the old display name
grep -rn "<old-display-name>" app/ components/ lib/ --include="*.tsx" --include="*.ts"
# Should return zero hits (UI flows through PLANS[id].name dynamically)

# 4. Verify internal ID is still in use
grep -rn "'PRO'" lib/ app/ --include="*.ts"
# Should return many hits — that's expected, internal IDs are referenced everywhere

# 5. Run typecheck + tests
npx tsc --noEmit
npx vitest run __tests__/billing-

# 6. Visual confirm
#    /pricing → updated label appears
#    /settings/billing → updated label in plan cards + current-plan badge
#    Stripe dashboard → unchanged (internal IDs untouched)
```

## Verification

- `lib/billing/plans.ts` shows new label, old internal ID
- TypeScript compiles
- Tests pass
- `/pricing` and `/settings/billing` show new label
- Stripe Products view unchanged
- Subscription rows in DB still reference internal ID (not new label)

## Failure modes

- **Renaming the internal ID** — `PlanType = 'FREE' | 'PRO' | 'TEAM'` literals are stored in `Subscription.plan` column. Changing them requires a DB migration AND a Stripe metadata update on existing subscriptions. Don't do this in a "rename" flow.
- **Hardcoded display name in UI** — if a component does `if (plan === 'Pro') ...` instead of reading `PLANS[plan].name`, the label change won't propagate. Sweep with grep.
- **Comparison-page or use-case-page references** — `app/compare/**` and `app/use-cases/**` may have hardcoded plan names in marketing copy. These need separate edits (and should go through `voice-check` + `brand-ops`).
- **Stripe Product Name** vs **Stripe Price Description** — neither directly affects checkout, but appears in customer's Stripe receipt. Update via Stripe Dashboard or stripe CLI for visual consistency.
- **Plan-rename log** — no automatic audit-log entry for the rename. Manually add to `MEMORY.md` decision log.

## Owner

`finance`
