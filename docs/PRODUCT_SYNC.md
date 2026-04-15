# Product Sync — Landing, Pitch, Platform

One product, three surfaces. When a core narrative or pricing shape
changes in one place, it has to change in all three or the story
contradicts itself. This file is the propagation log.

Surfaces:

1. **Landing page** — `app/page.tsx` + marketing copy on `/pricing`,
   `/how-it-works`, `/for-teams`. Public-facing. Sets expectations.
2. **Pitch deck** — the investor/accelerator pptx (lives outside the
   repo in `~/Desktop/GRID — Pitch Deck.pptx`). Sets valuation framing.
3. **Platform** — in-app copy: `/sign-up`, `/welcome`, `/settings/ai`,
   error messages, empty states. Delivers what was promised.

Every time the core story shifts, add an entry below with:
- Date
- What changed
- All three surfaces updated (or a TODO to update the ones that weren't)
- Files touched

---

## 2026-04-10 · BYOK architecture (closed → byok → live tiers)

**Change.** Nova now runs on a per-environment Anthropic API key
resolved at each invocation, instead of a process-wide singleton using
`process.env.ANTHROPIC_API_KEY`. Three tiers controlled by
`GRID_BETA_TIER`:

- `closed` (default) — platform key fallback, daily token cap per env.
  Invite-only alpha. Nicole dogfooding + first design partners.
- `byok` — public beta. Anyone can sign up. Nova refuses to run until
  the env owner connects their own Anthropic key at `/settings/ai`.
  Zero marginal cost to GRID — users pay Anthropic directly.
- `live` — public launch. `byok` PLUS a planned ~50-invocation trial on
  the platform key (hard-capped ~$5–25/user worst case) before BYOK
  required. Stripe subs + SSO + enterprise unlock. Not yet active.

**Why.** Lets GRID ship to mass market without taking on LLM COGS. Each
tenant's usage is billed, rate-limited, and audited by their own
Anthropic account. GRID's marginal cost per user stays at "DB rows +
hosting CPU" which is sub-cent.

**Platform — DONE.**

- `prisma/schema.prisma` — added `Environment.anthropicKeyEnc`,
  `anthropicKeyPreview`, `anthropicKeyAddedAt`, `anthropicKeySource`.
- `lib/crypto/key-encryption.ts` — AES-256-GCM at-rest encryption,
  `GRID_ENCRYPTION_KEY` env var, nonce.ciphertext.tag format.
- `lib/config.ts` — `getBetaTier()`, `requiresByokKey()`,
  `getPlatformKeyDailyCap()`.
- `lib/nova/client-factory.ts` — `getAnthropicClientForEnvironment()`
  with tier-aware resolution + `MissingKeyError` + `validateAnthropicKey()`.
- `lib/nova.ts` — removed module-level singleton, calls factory at the
  top of `runNovaAgent`, catches `MissingKeyError` and emits a
  user-facing `NovaEvent { type: 'error' }` with deep link.
- `app/api/settings/anthropic-key/route.ts` — GET/POST/DELETE with live
  1-token Haiku validation before storing.
- `app/settings/ai/page.tsx` — paste key, see preview, disconnect/rotate.
- `app/settings/page.tsx` — quick link + workspace-tab CTA to `/settings/ai`.

**Landing page — TODO.**

- `/pricing` page needs a "$0 platform fee + you pay Anthropic
  directly" row with a link to console.anthropic.com/settings/keys.
- Home hero should call out BYOK as a feature, not a caveat ("Your key,
  your account, your bill — we just orchestrate").
- `/how-it-works` needs a section on the Nova → tenant Anthropic key
  resolution so visitors understand why there's no usage meter.
- FAQ: "Do I need an Anthropic account?" / "What happens if I run out
  of quota?" / "Can I switch keys later?"
- Sign-up CTA should note "bring your own Anthropic key" so users don't
  arrive expecting a free trial and hit the wall at first Nova run.

**Pitch deck — TODO.**

- "Business model" slide: shift from "$X/user/mo SaaS" framing to
  "$0 platform fee during public beta, Stripe sub activates at live
  tier, near-zero marginal cost per user." This is the capital
  efficiency story.
- "Go to market" slide: emphasize the zero-COGS beta as the thing that
  lets Nicole run this solo without burning runway on LLM spend.
- "Defensibility" slide: the visual ecosystem layer (particle flow
  between systems, Nova as superagent meta-orchestrator) is the moat.
  BYOK removes the COGS friction that would otherwise block reaching
  the scale where that moat becomes visible.

**Copy rules to keep everything consistent.**

- Always say "Anthropic key" (not "API key" generically).
- Always say "we validate with a 1-token ping" when explaining why the
  save button takes a second — don't hide the latency.
- Preview format is `sk-ant-...XXXX`. Never show full key in UI, logs,
  export bundles, Resend emails, error toasts, or audit log.
- Tier copy: `closed` = "private alpha", `byok` = "public beta",
  `live` = "launch" — use these exact words.

---

## Future entry template

```
## YYYY-MM-DD · <short title>

**Change.** <what shifted in the product story>

**Why.** <why we shifted>

**Platform — DONE / TODO.** <list of files>
**Landing page — DONE / TODO.** <pages/sections>
**Pitch deck — DONE / TODO.** <slides>

**Copy rules.** <anything to keep consistent across all three>
```
