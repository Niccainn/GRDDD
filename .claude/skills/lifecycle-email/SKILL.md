---
name: lifecycle-email
description: Use this skill to draft a lifecycle/transactional email — onboarding sequence, activation nudge, retention touch, win-back. Same editorial standard as error messages (the most important writing surface). Brand + voice compliant; routes through brand-ops; depends on RESEND_API_KEY being wired before any of these actually send.
---

# Skill: lifecycle-email

## When to invoke

- Onboarding/activation sequence drafting
- A retention or win-back touch is requested
- A `marketing-feedback-loop` finding shows a drop-off a timely email could catch
- Reviewing existing transactional copy for voice

## Hard dependency

Email only sends in prod when `RESEND_API_KEY` is set (per `lib/email-verification.ts` — absent it, sign-up auto-verifies and nothing sends). This skill *drafts*; flag in the output that send is gated on the operator wiring `RESEND_API_KEY`. Don't imply emails are going out if they aren't.

## Procedure

```
1. Define the trigger + the one job of this email. One email = one
   action. If it has two CTAs it's two emails.

2. Draft per BRAND_GUIDELINES email section:
   - No logo header — "GRID" wordmark text, Geist 200, letterspaced
   - Black bg, white text, ONE lime pill CTA
   - Subject: < 50 chars, concrete, no banned words, no exclamation,
     not "🎉 Welcome!" — "Your workspace is ready" energy
   - Body: short, one beat per sentence, lands on the action
   - Signature: Nicole, first-person singular. Never "the GRID team"
     (BRAND_GUIDELINES: honest and small)
   - Errors/edge copy follow the error-message standard: what/why/
     what-next with a one-click action

3. Specify the trigger logic for engineer (when it fires, the
   suppression rules — don't email a user who just did the thing).

4. voice-check → brand-ops sign-off. Note RESEND_API_KEY dependency.
   Hand trigger logic to engineer if implementation is requested.
```

## Verification

- One email, one job, one CTA
- Subject + body pass `voice-check` (no emoji, no exclamation, GRID uppercase, Atrium not Nova)
- Signature is first-person Nicole, not "the team"
- Output explicitly states send is gated on `RESEND_API_KEY` (operator)
- `brand-ops` signed off
- Suppression rule specified (no emailing someone who just converted)

## Failure modes

- **Implying it sends when it doesn't** — `RESEND_API_KEY` unset = nothing ships. Always flag the dependency; route it to `operator` via the loop.
- **Marketing-email tone in a transactional** — "Don't miss out!" in a verification email. Transactional = considered, useful, no urgency theatre.
- **Two CTAs** — split into two emails or pick the one job.
- **"The GRID team" signature** — BRAND_GUIDELINES is explicit: first-person singular, honest and small.
- **No suppression logic** — emailing a user about the thing they just did erodes trust fast.

## Owner

`growth` (draft) → `brand-ops` (sign-off) → `operator` (`RESEND_API_KEY`) → `engineer` (trigger logic)
