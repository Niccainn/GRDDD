# GRID — Incident Response Runbook

> Last updated: 2026-04-19. One-page process for declaring, triaging,
> notifying, and closing out a security incident. Required by GDPR
> Article 33 (72-hour notification) and Article 34 (user notification
> when rights & freedoms at risk).

## Severity classification

Pick the highest tier that matches.

| Severity | Definition | First response target |
|---|---|---|
| **SEV-1** | Confirmed unauthorized access to tenant data, account takeover at scale, encrypted-at-rest data exposed, financial data exposed | **15 minutes** |
| **SEV-2** | Potential data exposure (unconfirmed), single-tenant breach, ongoing active attack, auth bypass discovered | **2 hours** |
| **SEV-3** | Denial-of-service affecting majority of users, silent data corruption, failed backups | **24 hours** |
| **SEV-4** | Minor data leak with no rights impact, third-party subprocessor disclosure, cosmetic security issue | **5 business days** |

## The moment you suspect an incident — do these in order

### 1. Declare (within 15 min of discovery)

Create an internal note with:
- What you saw (concrete — which URL, which user, which log line)
- When you first saw it
- Who else knows
- Severity guess

If SEV-1 or SEV-2, pause non-critical deploys. Do not fix the issue
yet — preserve the evidence first.

### 2. Contain (within 1 hour of declaration)

Priority order for containment actions:

- **Revoke active sessions** — `DELETE FROM "Session" WHERE …` for the
  affected identities. Forces re-auth.
- **Rotate GRID_ENCRYPTION_KEY** — only if the old key is compromised.
  Requires re-encryption of Environment.anthropicKeyEnc, ConsentLog.ipHash,
  AppError.context — a separate migration.
- **Rotate integration OAuth tokens** — for any compromised integration,
  soft-delete the Integration row to force users to reconnect.
- **Block the attacker IP** — at Vercel's firewall or via middleware
  deny-list (requires a code change).
- **Disconnect an OAuth provider** — remove the CLIENT_ID + CLIENT_SECRET
  from env vars to halt any OAuth flow until the provider-side issue
  is fixed.
- **Take the site down** — `vercel pause` via dashboard. Last resort;
  doubles as a public signal that something is wrong.

### 3. Assess scope (within 4 hours)

Answer in writing:

- How many identities are affected?
- What data categories were exposed? (email, workspace content, BYOK keys, billing info)
- Was personal data of EU/UK residents involved? If yes, GDPR Art. 33 clock started at 3.
- Was payment data involved? (Almost always "no" because Stripe holds it.)
- Is the vulnerability still exploitable, or contained?

Save the assessment in `docs/incidents/YYYY-MM-DD-slug.md` (git-committed,
reviewed by counsel before publishing publicly).

### 4. Notify (if required)

**Supervisory authority notification** — GDPR Art. 33, within 72 hours
of becoming aware of the breach, for breaches "likely to result in a
risk to the rights and freedoms of natural persons."

Default authority lookup by data subject's residence:

| Country | Authority | Notification form |
|---|---|---|
| Ireland (EU one-stop) | Data Protection Commission | https://www.dataprotection.ie/en/organisations/know-your-obligations/breach-notification |
| UK | ICO | https://ico.org.uk/for-organisations/report-a-breach/ |
| Germany | BfDI | https://www.bfdi.bund.de/ |
| France | CNIL | https://www.cnil.fr/en/notifying-data-breach |
| Netherlands | Autoriteit Persoonsgegevens | https://autoriteitpersoonsgegevens.nl/en |
| Canada (PIPEDA) | OPC | https://www.priv.gc.ca/en/report-a-concern/ |
| California | Attorney General (if >500 affected) | https://oag.ca.gov/ecrime/databreach/reporting |
| US federal (general) | No central authority — notify per state laws | State attorney general offices |

**User notification** — GDPR Art. 34, without undue delay, when the
breach is "likely to result in a high risk to rights and freedoms."
Send via the email address on file. Content must include:
- Description of the breach (plain language)
- Data categories affected
- Likely consequences
- What the user should do (change password, revoke tokens, etc.)
- Who to contact (security@grid.systems)

Use `/api/account/export` to produce the affected-identity manifest.
Send individually via Resend, not in a blast.

### 5. Fix + deploy (within severity-specific timeline)

- SEV-1 / SEV-2: fix + deploy within 14 days; validate in staging first.
- SEV-3: 30 days.
- SEV-4: 60 days.

The fix itself is a normal PR with tests. Reference the incident slug
in the commit message.

### 6. Post-incident review

Within 7 days of closure, produce a retro document covering:
- Timeline from first signal to fix deployed
- Root cause (5-why exercise)
- What failed to detect it (what test/monitor should have caught it)
- What's changed to prevent recurrence
- User-facing summary (for /changelog)

File as `docs/incidents/YYYY-MM-DD-slug-retro.md`.

## Contact list

| Role | Name | Email | Notes |
|---|---|---|---|
| Security contact (public) | — | security@grid.systems | Reporters use this |
| Primary responder | Nicole Cain | nicole@grid.systems | 24/7 — on-call solo |
| Legal counsel | — (not yet retained) | — | Engage before ToS/Privacy sign-off on any notification |
| DB provider | Turso / Neon / Supabase | per provider | Keep account recovery info in 1Password |
| Vercel support | help@vercel.com | — | Hobby tier = community only; Pro = business hours |

**Action after first non-author tester**: retain a tech-focused privacy
lawyer (Boodle Hatfield, Bird & Bird, or a local equivalent) even on
a "call-us-when-needed" basis before the first EU user signs up.

## What is NOT an incident

Keep scope honest so the runbook stays credible:

- Normal error rate on `AppError` — triage via admin dashboard, not here.
- User typed their own password wrong — not an incident.
- Integration provider's own outage (Slack down, Google Calendar down) — not our incident.
- Failed sync that recovers on the next tick — silent-sync detector handles it.
- Security researcher report — belongs to `/security` process, not here.

## Dry-run this runbook quarterly

Pick a hypothetical (e.g. "BYOK key of environment X was exposed in
a log") and walk the steps. Confirm:
- Contacts are still reachable
- DB commands still work as written
- Regulator URLs resolve
- Email template still makes sense

Log the dry-run in `docs/incidents/drills/YYYY-Q.md`.
