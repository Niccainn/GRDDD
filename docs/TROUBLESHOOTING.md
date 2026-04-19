# GRID — Troubleshooting

Common problems and the specific steps to fix them. Grouped by where
the user encounters the symptom. Each entry: **Symptom →
Likely cause → Fix**.

## Sign-up / sign-in

### Symptom: "Invalid email or password"
**Likely cause**: wrong password, or account was signed up via OAuth and has no password set yet.
**Fix**:
1. Try **Continue with Google** (if you signed up via Google)
2. Try password reset at `/sign-in` → **Forgot password**
3. If reset email doesn't arrive in 5 min, see next entry

### Symptom: Password reset email never arrives
**Likely cause**: the operator hasn't verified their Resend domain DNS, so outbound email is dropped.
**Fix** (if you're an admin/operator):
1. Check `/admin` → recent errors → look for `scope: email, reason: unconfigured`
2. Configure Resend: https://resend.com/domains → add your domain → paste the DNS records into your registrar
3. Once verified, retry the password reset
**Fix** (if you're a user): email support@grid.systems — the operator needs to fix it.

### Symptom: "Please accept the Terms of Service and Privacy Policy to continue"
**Likely cause**: the required consent checkbox on sign-up wasn't ticked.
**Fix**: tick the first checkbox (required). The marketing checkbox is optional.

### Symptom: "Rate limited" on sign-up
**Likely cause**: you attempted too many signups from the same IP in a short window.
**Fix**: wait 15 min and try again. This is designed to block bot farms; a real user hits it rarely.

## Onboarding / workspace

### Symptom: Wizard keeps redirecting to `/sign-in`
**Likely cause**: session cookie not being set. Usually because the browser blocks third-party cookies aggressively, or the site isn't on HTTPS (local dev).
**Fix**:
1. Use the production URL (https://grddd.com) not an HTTP-only staging
2. Allow first-party cookies for the site
3. If on Safari, disable "Prevent cross-site tracking" for this domain

### Symptom: "Environment already exists" when naming your workspace
**Likely cause**: you already created a workspace with the same slug.
**Fix**: pick a different name. Your sign-up generated an initial workspace already; view existing workspaces via the environment picker at the top of `/settings`.

### Symptom: Scaffold widget on dashboard doesn't appear
**Likely cause**: your workspace isn't empty — the widget only shows when there are zero systems and zero executions.
**Fix**: delete everything at `/systems` and `/workflows` if you really want to scaffold from scratch, or just use `+ New system` instead.

## Nova / AI layer

### Symptom: "Connect your Anthropic account to activate Nova"
**Likely cause**: no BYOK key is set for your workspace, and you're in `byok` or `live` tier (or you've burned through the trial tokens in `closed` tier).
**Fix**:
1. Go to `/settings/ai`
2. Paste an Anthropic API key (starts with `sk-ant-`). Get one at https://console.anthropic.com/settings/keys
3. Click **Connect**. Nova validates with a 1-token ping, then encrypts at rest
4. Preview shows `sk-ant-...XXXX` — the plaintext never leaves your browser again

### Symptom: "Your stored Anthropic key could not be read. Please reconnect your account."
**Likely cause**: the master encryption key (`GRID_ENCRYPTION_KEY`) was rotated without re-encrypting stored data, or the row was corrupted.
**Fix**: go to `/settings/ai` → **Disconnect** → **Connect** with a fresh key.

### Symptom: Nova says "I can't help with that" or refuses to use a tool
**Likely cause**: per-system agent's autonomy tier is too restrictive, or its tool allow-list excludes the tool it needs.
**Fix**:
1. `/systems/[id]/agent` → check autonomy tier
2. Consider raising from Observe → Suggest, or Suggest → Act
3. Add the missing tool to `toolAllowList`
4. Rerun the workflow

### Symptom: Nova's output is wildly wrong / hallucinating
**Likely cause**: insufficient context in the prompt, or confidence is low (check the chip).
**Fix**:
1. Reject the output — your rejection becomes a MasteryInsight
2. Edit the workflow stage's instruction to be more specific
3. Enable the critic pass (`selfIterate: true` when scaffolding)
4. Retry

### Symptom: Rate limited by Anthropic
**Likely cause**: your BYOK plan on Anthropic's side has a low concurrent-request ceiling.
**Fix**: upgrade your Anthropic tier at console.anthropic.com, or reduce parallel workflows. GRID doesn't rate-limit you — Anthropic does.

## Integrations

### Symptom: Integration card shows "Setup required"
**Likely cause**: the operator hasn't registered an OAuth app with this provider yet.
**Fix (if you're the operator)**: see `docs/INTEGRATIONS_SETUP.md` → look up the provider → register the OAuth app → set the listed env vars in Vercel → redeploy.
**Fix (if you're a user)**: wait for the operator. The badge updates automatically once env vars are set.

### Symptom: "Google Calendar · undefined" in the connected row
**Likely cause**: the OAuth scopes requested at connect time didn't include openid/email/profile, so displayName couldn't be built.
**Fix**:
1. Click **Reconnect →** inline (if banner is showing)
2. If no banner, disconnect the row and reconnect from scratch
3. New connection will include correct scopes; displayName populates correctly

### Symptom: "No test handler for provider X"
**Likely cause**: you're on an older deploy (< `d1074f4`) that lacks the test handler for this provider.
**Fix**: operator needs to redeploy. Affects only the Test button — data still flows.

### Symptom: Connected integration shows "ACTIVE" but no data appears in inbox / calendar
**Likely cause #1**: the cron isn't running (missing `GRID_CRON_TOKEN` env var).
**Fix (operator)**: set `GRID_CRON_TOKEN` in Vercel, redeploy.

**Likely cause #2**: the token is expired or scopes are missing.
**Fix**: Reconnect button on the integration row.

**Likely cause #3**: this provider is **Connect only** tier (no sync path implemented yet).
**Fix**: check the tier badge on the card. If it says "Connect only," data won't flow automatically. Use the integration from within a workflow instead.

### Symptom: Silent-sync alert in inbox: "Notion has gone quiet"
**Likely cause**: Notion has produced zero signals for 45+ min when it usually produces several/day. Usually the token expired or Notion changed their API.
**Fix**: click the alert, then **Reconnect →** on the Notion row in /integrations.

## Calendar

### Symptom: Empty calendar despite connecting Google Calendar
**Likely cause**: same as "ACTIVE but no data" above.
**Fix**: check the red banner at top of `/calendar`. Click **Reconnect →** if present.

### Symptom: Keyboard shortcuts don't work
**Likely cause**: focus isn't on the calendar grid — might be on the page background.
**Fix**: Tab into the calendar once (or click any cell). Arrow keys will now move focus day-to-day.

### Symptom: Events don't appear on the right dates
**Likely cause**: timezone mismatch between Google Calendar and your browser.
**Fix**: check `/settings/preferences` → Timezone. Set to match Google Calendar's setting.

## Tasks / inbox

### Symptom: "→ Task" button doesn't convert my signal
**Likely cause**: you're on an old deploy that lacks the endpoint.
**Fix (operator)**: redeploy. Endpoint is `/api/signals/[id]/to-task`, shipped in 794925d.

### Symptom: Bulk actions are greyed out
**Likely cause**: nothing selected.
**Fix**: click the checkboxes on the rows you want to act on.

## Admin / operator

### Symptom: `/admin` returns "Not found"
**Likely cause**: `GRID_ADMIN_EMAIL` env var doesn't match the email you signed in with.
**Fix**:
1. Vercel → Settings → Env Vars → check `GRID_ADMIN_EMAIL`
2. Confirm it exactly matches (case-insensitive) your identity email
3. Redeploy so the new env var takes

### Symptom: `/api/health` returns `"status": "unhealthy"`
**Likely cause**: database is unreachable or `GRID_ENCRYPTION_KEY` missing.
**Fix**:
1. Check Vercel → Settings → Env Vars for missing critical vars
2. Check your DB provider dashboard — is the DB online?
3. Check `/admin` AppError panel for more detail

### Symptom: `/api/health` returns `"status": "degraded"` with warns on email, monitoring, redis, storage
**Likely cause**: optional services not configured. This is normal for a minimal deploy and not a failure.
**Fix**: configure any you need (Resend for email, Upstash for distributed rate-limit, S3 for storage). None is strictly required for core operation.

### Symptom: Cron jobs (`/api/cron/*`) return 503 "Cron disabled"
**Likely cause**: `GRID_CRON_TOKEN` is unset.
**Fix**: `openssl rand -base64 32` → set as env var in Vercel → redeploy.

### Symptom: Vercel deploys aren't reflecting my git pushes
**Likely cause**: see `docs/PRODUCTION_READINESS.md` → "What could actually get you fined today" has a whole section on this. Most common: GitHub-Vercel webhook disconnected, auto-deploy paused, or a failing build blocking the queue.
**Fix**: Vercel dashboard → Deployments → manual redeploy "no build cache." If that doesn't work, check Settings → Git to verify the integration is connected.

## Security / compliance

### Symptom: "Webhook URL rejected: blocked IPv4"
**Likely cause**: you tried to save a webhook pointing at a private IP (10.x.x.x, 192.168.x.x, 127.0.0.1, etc.). This is deliberate — it would be an SSRF vector.
**Fix**: use a publicly-resolvable URL. For local testing, use ngrok or a similar tunnel.

### Symptom: "Live Stripe keys are only permitted in the live tier"
**Likely cause**: `STRIPE_SECRET_KEY` starts with `sk_live_` but `GRID_BETA_TIER` is `closed` or `byok`.
**Fix**: either set `GRID_BETA_TIER=live` (for production launch) or swap to `sk_test_` (for beta).

### Symptom: Data-export download starts but file is empty
**Likely cause**: you're exporting a workspace with nothing in it.
**Fix**: check you're signed in as the right identity. Also check `/admin` if you're the operator to confirm data actually exists in that environment.

## If nothing here fixes it

1. Screenshot the symptom + the URL you're on
2. Hit Nova (bottom-right bar) and ask — paste the screenshot context
3. If Nova can't help: email support@grid.systems with the screenshot
4. Security issues (anything that might leak data, allow unauthorized access, or take down the service): security@grid.systems
