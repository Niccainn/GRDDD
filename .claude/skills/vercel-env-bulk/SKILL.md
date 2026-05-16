---
name: vercel-env-bulk
description: Use this skill any time a Vercel environment variable needs to be set or rotated — single env, bulk env, key rotation, "fix the empty values", "set X across all environments". Bypasses the Vercel UI form race that silently submits empty strings, and the `vercel env add` interactive prompt that drops paste. Always uses clipboard → temp file → stdin pipe.
---

# Skill: vercel-env-bulk

## When to invoke

- "Rotate the X key everywhere"
- "Set Y env var on production + preview"
- "The Vercel UI keeps saving empty values" (this is the exact failure mode this skill prevents)
- Pre-deploy when a new env-driven feature is shipping
- Recovery: `vercel env pull` shows `KEY=""` when you set it via the UI

## Procedure (single value)

```bash
cd /Users/nc/projects/grid

# 1. Get the value on clipboard (user does this in Stripe/Sentry/wherever)
# 2. Snapshot to a 600-perm temp file via pbpaste — value never on a command line
umask 077
pbpaste | tr -d '\n\r' > /tmp/_v
chmod 600 /tmp/_v

# 3. Sanity check — length + prefix (no value display)
LEN=$(wc -c < /tmp/_v | tr -d ' ')
PFX=$(head -c 8 /tmp/_v)
echo "saved $LEN chars, prefix '$PFX'"
# REFUSE if prefix doesn't match expected (e.g., sk_test_ for Stripe test key)

# 4. Wipe existing entry (if any) so add doesn't collide silently
KEY="STRIPE_SECRET_KEY"  # SET PER INVOCATION
vercel env rm "$KEY" production --yes 2>/dev/null
vercel env rm "$KEY" preview    --yes 2>/dev/null

# 5. Add via stdin redirection — value never on command line
vercel env add "$KEY" production < /tmp/_v
vercel env add "$KEY" preview    < /tmp/_v

# 6. Wipe temp file
shred -u /tmp/_v 2>/dev/null || rm -f /tmp/_v

# 7. Verify length persisted
vercel env pull /tmp/_chk --environment=production --yes
v=$(grep "^${KEY}=" /tmp/_chk | cut -d= -f2- | sed 's/^"//;s/"$//')
echo "$KEY: ${#v} chars stored (prefix: $(echo "$v" | head -c 8))"
rm -f /tmp/_chk
```

## Procedure (bulk — multiple values from a heredoc)

For multiple at once, ask the user to paste a heredoc with the values, then loop:

```bash
# User pastes:
umask 077
cat > /tmp/_kv <<'EOF'
KEY1=value1
KEY2=value2
KEY3=value3
EOF
chmod 600 /tmp/_kv

# Then this skill:
while IFS='=' read -r k v; do
  [ -z "$k" ] && continue
  printf '%s' "$v" > /tmp/_v
  vercel env rm "$k" production --yes 2>/dev/null
  vercel env rm "$k" preview --yes 2>/dev/null
  vercel env add "$k" production < /tmp/_v
  vercel env add "$k" preview    < /tmp/_v
done < /tmp/_kv
shred -u /tmp/_kv /tmp/_v 2>/dev/null || rm -f /tmp/_kv /tmp/_v
```

## After setting envs — always

```bash
# Force a redeploy that skips build cache (otherwise old envs are baked in)
vercel deploy --prod --force --yes

# Then verify-deploy skill confirms the bundle has the new content
```

## Failure modes

- **UI form race** — paste-then-fast-Save in the Vercel dashboard submits empty string. The dashboard shows green; the value is `""`. ALWAYS verify with `vercel env pull` length check after any UI write. This skill exists to never use the UI.
- **Interactive prompt drops paste** — `vercel env add KEY production` (no stdin) shows `? What's the value?` — paste sometimes doesn't reach the field before Enter. Pipe via `< /tmp/_v` to bypass.
- **Literal `\n` in pulled values** — happens when value was originally pasted with trailing newline. The `tr -d '\n\r'` in step 2 prevents recurrence; use regex extract to clean an existing one (`grep -oE 'sk_[a-z]+_[A-Za-z0-9]+'`).
- **Build cache hides the new value** — env vars are inlined at build time. Always use `--force` on the post-set deploy.
- **Wrong scope** — `production` vs `preview` vs `development` are separate. Most secrets need both production + preview (so preview deploys can also work). Development scope stays empty so `npm run dev` falls back to local `.env`.

## Owner

`operator`
