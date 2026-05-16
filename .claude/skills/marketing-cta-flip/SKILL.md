---
name: marketing-cta-flip
description: Use this skill when opening or closing public sign-up — flipping every marketing CTA between the closed-beta waitlist and the open sign-up funnel. Single source of truth is `lib/marketing-cta.ts`; this skill flips the two fields and verifies all 8 surfaces follow.
---

# Skill: marketing-cta-flip

## When to invoke

- "Open public sign-up" / "go live with the funnel"
- "Close sign-up, back to waitlist"
- Editing `lib/marketing-cta.ts`
- Pre-launch gate: this is typically the LAST step after Stripe + email-verification + OAuth all verified

## The single toggle

`lib/marketing-cta.ts` exports one constant. Two fields control every cross-page marketing CTA:

```ts
// Closed beta (current default):
export const MARKETING_CTA = {
  href: '/#waitlist',
  label: 'Request access',
};

// Open funnel:
export const MARKETING_CTA = {
  href: '/sign-up',
  label: 'Get started',
};
```

The home page (`app/page.tsx`) intentionally uses an inline `#waitlist` anchor for `<WaitlistForm>` focus — that's deliberate, leave it.

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Edit the two fields in lib/marketing-cta.ts (use Edit tool)

# 2. Verify every marketing surface imports the constant (not hardcoded)
grep -rn "MARKETING_CTA" app/ --include="*.tsx"
# Expected surfaces: app/pricing, app/access, app/blog/[slug], app/blog/week-1,
# app/use-cases (index + [slug]), app/compare (index + [slug])

# 3. Find any hardcoded /sign-up or /#waitlist that should use the constant
grep -rn "href=.\"/sign-up\"\|href=.\"/#waitlist\"" app/ --include="*.tsx" | \
  grep -v "lib/marketing-cta" | grep -v "app/page.tsx" | grep -v "app/sign-in"
# Any hit here = a surface that bypasses the toggle. Fix it to use MARKETING_CTA.
# (PRs #66 and #78 each shipped with missed surfaces — that's why this constant exists.)

# 4. tsc + commit + PR + merge

# 5. Deploy + verify
vercel deploy --prod --force --yes
# Then verify-deploy skill — confirm the new label/href on /pricing
```

## Verification

- `lib/marketing-cta.ts` shows intended `href` + `label`
- `grep MARKETING_CTA` shows all 8 cross-page surfaces import it
- No hardcoded sign-up/waitlist hrefs outside `app/page.tsx`, `app/sign-in`, and the constant
- Deployed: `/pricing` CTA shows new label, links to new href (use `verify-deploy`)
- `/sign-up` route itself still functions for invited users regardless of toggle (it's gated separately by `isPublicSignupEnabled()` in `lib/feature-flags.ts`)

## Failure modes

- **New marketing surface added with hardcoded CTA** — every new `/use-cases/*` or `/compare/*` page must import `MARKETING_CTA`, not hardcode. Step 3 grep catches this.
- **Toggle flipped but `/sign-up` still gated** — `lib/feature-flags.ts:isPublicSignupEnabled()` independently gates the API. Flipping the CTA without flipping the feature flag = users hit "Public signup is not available". Both must move together for a true open.
- **`/sign-up` page redirect** — `app/sign-up/page.tsx` redirects to `/#waitlist` in production when public signup is off, even with a direct link. Confirm the feature flag + env are aligned with the CTA intent.
- **Home page anchor confusion** — `app/page.tsx` uses inline `#waitlist`. This is intentional (inline WaitlistForm focus). Don't "fix" it to use the constant.
- **CDN cache** — after deploy, the old CTA may serve for up to 6h. Cache-bust verify.

## Owner

`growth` (with `operator` confirming the feature-flag + env alignment)
