# GRID — FAQ

Common questions, grouped. Keep answers short — longer explanations
belong in `USER_GUIDE.md`.

## Getting started

**Q: Do I need technical skills to use GRID?**
No. If you can set up Notion or Linear, you can use GRID. The
advanced pieces (workflow authoring, custom agents) are optional.

**Q: Can I try GRID without giving you an Anthropic API key?**
Yes, during closed beta. You get ~50K tokens on GRID's platform key
before you have to bring your own. After that, Nova refuses to run
until you connect your key at `/settings/ai`.

**Q: How much does Anthropic usage cost on my key?**
A typical scaffold is about $0.12. A workflow run with 4 Sonnet
stages is $0.08-$0.30. A long Nova chat session is rarely above
$0.50. You see actual usage in your own Anthropic dashboard — we
don't meter it.

**Q: Is GRID free?**
During beta, yes. GRID's platform fee is $0; you pay Anthropic
directly for your own LLM usage. Post-launch pricing hasn't been
set yet.

## Data, privacy, security

**Q: Where does my data live?**
Postgres database in the US region. See `/subprocessors` for the
complete list of third parties that process your data.

**Q: Is my Anthropic key stored securely?**
Yes. AES-256-GCM encryption at rest. The plaintext never enters our
logs, error messages, or Resend emails. The UI shows only a masked
preview like `sk-ant-...a7f3`.

**Q: Can another user in a different workspace see my data?**
No. Every API endpoint composes through a tenant-isolation guard that
returns 404 on cross-tenant access attempts (not 403 — we don't want
to leak the fact that your workspace exists to outsiders). See
`/security` for our responsible-disclosure policy.

**Q: What happens if I delete my account?**
Everything you own cascades: environments, systems, workflows,
signals, executions, memberships, sessions, app-error rows. There is
no undelete. We don't retain soft-deleted copies after 30 days.

**Q: Can I export my data before I leave?**
Yes. `GET /api/account/export` returns a JSON file with everything.
GDPR Article 20 (portability). Credentials are excluded — you
reconnect at the destination.

**Q: Do you sell my data?**
No. Never have, never will. See `/privacy`.

**Q: Are you GDPR compliant?**
We ship Articles 5(1)(e), 7, 15, 17, 20, 25, 28, and 32 in code.
See `docs/PRODUCTION_READINESS.md` for the detailed matrix. Breach
notification (Art. 33) runbook is in `docs/INCIDENT_RESPONSE.md`.

## Nova — the AI layer

**Q: What does Nova know about me?**
Everything in your workspace: systems, workflows, tasks, signals,
integrations, prior executions, reviews. It does NOT see other
tenants' data; it does NOT see anything outside your Environment
unless you explicitly connect it via an integration.

**Q: Can I turn Nova off for a specific system?**
Yes. Per-system agents have an **Observe** autonomy tier that
means "read-only, never write." Set it at `/systems/[id]/agent`.

**Q: What does the confidence chip mean?**
Nova-generated outputs (mastery insights, consequence predictions)
carry a calibrated confidence score. Low / moderate / good / high
are research-backed bands. Don't blindly trust "57%" — the chip
colour tells you whether to act on it.

**Q: Nova said something wrong. What do I do?**
1. Reject or edit the output
2. The rejection becomes a MasteryInsight with category
   `scaffold_correction` (or similar)
3. Nova uses this correction on your NEXT scaffold / run
4. If the same mistake happens repeatedly, report it — that's a
   product bug, not a one-off.

## Workflows

**Q: What's a workflow?**
A multi-stage Nova pipeline inside a system. Each stage has its own
prompt, tool scope, and tier (fast / balanced / deep). Stages that
don't depend on each other run in parallel.

**Q: How do I make a workflow?**
Three ways:
1. From a system page: click **+ New workflow**
2. From the Workflows page: **+ New**, pick a system
3. Via the scaffold widget on the dashboard — Nova drafts multiple
   workflows as part of the cell

**Q: Can I run a workflow on a schedule?**
Yes. Open the workflow → Triggers → **Add schedule**. Cron syntax.

**Q: What's a stage?**
One Nova call with one prompt. Stages can depend on other stages
(the output of "research" becomes input to "draft"), or run
independently.

**Q: What's an execution?**
A single run of a workflow. Each execution captures: input, stages
executed, tokens used, cost, output, duration. You can review,
checkpoint, and attribute credit.

## Integrations

**Q: How many integrations do you have?**
110+ providers can be OAuth-connected. Only a subset have continuous
sync (Notion, Slack, Google Calendar, HubSpot currently). See the
tier badge on each card — **Live sync**, **Import**, **Webhook
push**, or **Connect only**.

**Q: Why does Figma say "Setup required"?**
The operator (whoever runs this GRID deployment) hasn't registered
an OAuth app with Figma yet. See `docs/INTEGRATIONS_SETUP.md`
for which env vars are needed.

**Q: If my OAuth token expires, what happens?**
The integration shows an error. Click **Reconnect →** inline — it
deletes the broken row and starts a fresh OAuth flow. Same credentials,
same scope, re-issued token.

**Q: Can GRID write back to my connected tools?**
Phase 2 is read-only. Writes (pause Slack, update a Notion page,
push a Linear issue) come behind an explicit-permission layer in a
future release. Today, Nova can only read.

## Billing and plans

**Q: Is there a free tier?**
Yes, during beta. Everything works at $0 with your own Anthropic
key. Post-launch pricing will be announced in advance.

**Q: If you charge me later, how do I cancel?**
`/settings/billing` → Stripe customer portal → Cancel. Effective at
end of current period.

**Q: What happens to my data if I cancel?**
It stays. You can re-subscribe at any time. If you want it deleted
permanently, use the account-delete flow.

## Technical

**Q: Do you have an API?**
Yes — `/api/*`. Authenticated routes use session cookies
(for the UI) or API keys (for automation). Generate an API key at
`/settings/api-keys`.

**Q: Can I self-host GRID?**
The codebase runs on Next.js + Prisma + Postgres. The source is at
https://github.com/Niccainn/GRDDD. Self-hosting isn't officially
supported during beta but you have everything you need to do it.

**Q: Do you support SSO?**
Planned for the `live` tier. Current auth: password + Google OAuth.
GitHub OAuth is scaffolded but env vars are often missing — see
setup guide.

**Q: Is there a mobile app?**
Web-responsive down to ~375px (iPhone SE). Native apps aren't
planned before product-market fit.

## Troubleshooting

**Q: I signed up but didn't get a verification email.**
Check spam. If still missing after 5 min, the operator may not
have verified their email-sending domain. Contact support@grid.systems.

**Q: Password reset didn't arrive.**
Same as above. GRID logs every skipped email in the admin dashboard,
so the operator can see outgoing email is failing.

**Q: Why does Nova sometimes say "I can't help with that"?**
Your per-system agent has a constrained autonomy tier or a narrow
tool allow-list. Check at `/systems/[id]/agent`. Or it's hitting
a guardrail in Anthropic's content policy.

**Q: Calendar shows nothing after I connected Google.**
The token may have expired or scopes were incomplete. Go to
`/calendar`; if there's a red banner, click the **Reconnect →**
button.

**Q: Dashboard looks empty.**
Either you just signed up (correct — create a system or use the
scaffold widget) or you're filtering everything out. Clear the
layer toggles in the inbox / calendar sidebar.

## Team / sharing

**Q: How do I invite a teammate?**
`/settings/team` → Invite → email address + role. They receive an
email with a sign-up link pre-filled with your workspace.

**Q: What can each role do?**
- **ADMIN** — full write, connect integrations, manage billing
- **CONTRIBUTOR** — create/edit systems, workflows, tasks
- **VIEWER** — read-only

**Q: Can I share a single system with someone outside my workspace?**
Not yet. Everything is workspace-scoped. Share-by-link is on the
roadmap.

## Still stuck?

- Nova bar at the bottom-right — it has workspace context
- `docs/TROUBLESHOOTING.md` — detailed fixes
- Email support@grid.systems — 24h response Mon-Fri
- Security issue — security@grid.systems (see `/security`)
