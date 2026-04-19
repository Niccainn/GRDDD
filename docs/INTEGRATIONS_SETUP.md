# Integrations Setup

Internal ops doc. How to register the OAuth apps and set the env vars that light up each integration provider in `/integrations`.

The registry lives at `lib/integrations/registry.ts` — adding a provider there without its env vars just greys out the card with a "Setup required" badge, so it's safe to add stubs before wiring the OAuth app.

## Quick reference

| Provider | Where to register | Env vars needed |
|---|---|---|
| Figma | https://www.figma.com/developers/apps → Create app | `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET` |
| GitHub | https://github.com/settings/developers → OAuth Apps → New | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Google (Calendar / Drive / Workspace) | https://console.cloud.google.com/apis/credentials → Create credentials → OAuth client ID | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (shared across Google products) |
| HubSpot | https://app.hubspot.com/developer → Apps → Create app | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` |
| Linear | https://linear.app/settings/api/applications → New | `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` |
| Meta Ads | https://developers.facebook.com/ → Create app → Marketing API | `META_ADS_CLIENT_ID`, `META_ADS_CLIENT_SECRET` |
| Microsoft (Outlook / Teams) | https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps → New registration | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Notion | https://www.notion.so/my-integrations → New integration (public) | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` |
| Salesforce | https://help.salesforce.com → Connected Apps → New | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` |
| Shopify | https://partners.shopify.com → Apps → Create app | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` |
| Slack | https://api.slack.com/apps → Create New App | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` |
| Stripe | https://dashboard.stripe.com/apikeys (user-provided API key, no OAuth app) | (per-user API key, no env vars) |

For every OAuth provider, the redirect URI is:
```
{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/<provider>/callback
```

e.g. `https://grddd.com/api/integrations/oauth/figma/callback` for production, `http://localhost:3000/api/integrations/oauth/figma/callback` for local dev.

Env vars are set in Vercel → Project → Settings → Environment Variables. They take effect on the next deploy (or redeploy current). Missing vars are safe: the card shows "Setup required" instead of letting users hit a broken OAuth flow.

---

## Phase 2 — shipped

### Cloudflare (API token)

No OAuth app required. User creates their own token in the Cloudflare dashboard and pastes it into the connect modal.

1. Users go to **My Profile → API Tokens → Create Token** in Cloudflare.
2. Recommended scopes: `Zone:Read`, `Analytics:Read`, `DNS:Read`.
3. Paste the token into the Grid connect modal.

Grid validates the token with `GET /user/tokens/verify` before persisting. No env vars needed on the Grid side.

### Meta Ads (OAuth)

Requires a Meta app registered at https://developers.facebook.com/.

1. Create an app → Business type → add the **Marketing API** product.
2. In **App Settings → Basic**, copy the App ID and App Secret.
3. Under **Marketing API → Tools**, request `ads_read`, `ads_management`, `business_management` scopes (app review required before production).
4. Add the redirect URI: `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/meta_ads/callback`
5. Set env vars:

```
META_APP_ID=xxxxxxxxxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-grid-domain.com
```

Tokens issued are upgraded to **60-day long-lived** tokens immediately after the code exchange (see `lib/integrations/oauth/meta.ts`). When they expire, the user re-connects from `/integrations`.

---

## Phase 4 — shipped (read clients + tool registry)

All twelve providers below are now wired end-to-end (OAuth/API-key flow, decrypting client, Anthropic-tool registry entries). Each is `implemented: true` in the registry and auto-lights in the `/integrations` grid as soon as the env vars below are set. The operator still has to register each OAuth app with the vendor — we never ship client secrets.

### Google (Ads, Analytics, Search Console, Workspace)

All four share one OAuth app with per-API scopes.

1. Register an OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials.
2. Authorized redirect URIs (add **all five** — each Google surface
   uses its own callback, so a missing one fails with `redirect_uri_mismatch`):
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/google_ads/callback`
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/google_analytics/callback`
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/google_search_console/callback`
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/google_workspace/callback`
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/oauth/google_calendar/callback`
3. **Enable each API you actually use** in the Google Cloud API
   Library. OAuth alone lets users consent; each API must be
   separately enabled on the project, or calls return 403 "API has
   not been used in project X before." For Calendar:
   - https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   - Click ENABLE, wait ~60 seconds for propagation.
4. **OAuth consent screen — Testing vs Production mode:**
   - **Testing (default):** only users on the Test-users list can
     connect. Max 100. Add via
     https://console.cloud.google.com/auth/audience → Test users →
     **+ ADD USERS**. Good for closed beta.
   - **Production:** any Google user can connect, but Google requires
     **verification** for sensitive scopes (Calendar counts). Submit
     via **PUBLISH APP → SUBMIT FOR VERIFICATION**. Google reviews in
     3–7 days; they may request a short demo video of the scope in
     use. Required before a broad public launch — otherwise
     non-test-list users see an "App is being tested" / "unverified"
     warning screen.

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxxxxxx   # only for google_ads
```

### Salesforce

Connected App at https://help.salesforce.com/s/articleView?id=xcloud.connected_app_create.htm.

```
SALESFORCE_CLIENT_ID=3MVG9...
SALESFORCE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
```

### HubSpot

https://developers.hubspot.com/docs/api/working-with-oauth.

```
HUBSPOT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Slack

https://api.slack.com/apps → Create New App → From scratch.

```
SLACK_CLIENT_ID=xxxxxxxxxxxx.xxxxxxxxxxxx
SLACK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### GitHub

https://github.com/settings/developers → OAuth Apps → New OAuth App.

```
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Linear

https://linear.app/settings/api → OAuth applications.

```
LINEAR_CLIENT_ID=lin_oauth_xxxxxxxxxxxxxxxx
LINEAR_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
```

### Notion

https://www.notion.so/my-integrations.

```
NOTION_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_CLIENT_SECRET=secret_xxxxxxxxxxxxxxxxxxxx
```

### Stripe & Shopify

Both are API-key providers — no env vars on the Grid side. Users paste a restricted/admin key into the connect modal.

---

## Adding a new provider

1. Add an entry to `PROVIDERS` in `lib/integrations/registry.ts` with `implemented: false` first.
2. For OAuth: add `lib/integrations/oauth/<id>.ts` exporting an `OAuthProvider` definition + any provider-specific exchange quirks (see `meta.ts` for how to handle long-lived token upgrade).
3. For API key: add `lib/integrations/apikey/<id>.ts` with a `test<Provider>Connection(creds)` function that validates + returns the sanitized summary.
4. Add `lib/integrations/clients/<id>.ts` exposing read-only operations agents can invoke as tools.
5. Wire the provider into the `switch (provider)` blocks in:
   - `app/api/integrations/route.ts` (POST, for api_key)
   - `app/api/integrations/oauth/[provider]/start/route.ts` (for oauth)
   - `app/api/integrations/oauth/[provider]/callback/route.ts` (for oauth)
   - `app/api/integrations/[id]/test/route.ts` (for the test button)
6. Flip `implemented: true` in the registry.
7. Add a section to this doc with setup instructions.

No page-level changes needed — the /integrations page auto-renders new providers from the registry.

---

## Security notes

- All credentials are AES-256-GCM encrypted at rest via `lib/crypto/key-encryption.ts`, keyed on `GRID_ENCRYPTION_KEY`.
- `credentialsPreview` (the masked suffix shown in the UI) is the ONLY plaintext surface that touches the client bundle or logs.
- OAuth state is HttpOnly, SameSite=Lax, 10-minute expiry, bound to `environmentId` so redirect-spoofing can't swap credentials into a different tenant.
- Soft-delete + zeroed credentials on disconnect — a revoked integration can't be silently re-activated from a stale DB replica.
- Write operations (pause campaign, send Slack message, update CRM record) are **NOT** exposed in Phase 2. They will go behind an explicit-permission layer in Phase 5 — never auto-executed from inside an agent run.
