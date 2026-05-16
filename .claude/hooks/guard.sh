#!/usr/bin/env bash
# Claude Code PreToolUse guard for GRID.
#
# Receives the tool-call JSON on stdin. Exits 2 to BLOCK the tool call
# (Claude sees the stderr message and must ask the user). Exits 0 to
# allow. Anything else = non-blocking error (tool still runs).
#
# Design principle: FEW, PRECISE rules. A guard that false-positives
# on commit messages or echo'd fixtures trains people to ignore it.
# We only block the genuinely catastrophic + genuinely unambiguous.
# Everything else is handled by the settings.json `ask` permission
# list (vercel env rm/add, stripe, force-push, reset --hard, rm -rf).

set -uo pipefail

input=$(cat)

tool=$(echo "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_name",""))' 2>/dev/null || echo "")
cmd=$(echo "$input"  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")

[ "$tool" = "Bash" ] || exit 0
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by .claude/hooks/guard.sh: $1" >&2
  echo "If intentional, state what you're doing, get explicit user confirmation, then proceed." >&2
  exit 2
}

# Only inspect the FIRST simple-command of the line — the verb the
# shell will actually execute first. This deliberately ignores
# arguments, quoted strings, heredocs, and anything after && / ; / |
# so commit messages and echo fixtures never trip the guard.
first=$(echo "$cmd" | sed -E 's/[[:space:]]*&&.*//; s/[[:space:]]*;.*//; s/[[:space:]]*\|.*//' | head -1)

# 1. Catastrophic, unambiguous rm targets only.
if echo "$first" | grep -qE '^\s*(sudo\s+)?rm\s+(-[a-zA-Z]*\s+)*(-rf|-fr|-r\s+-f|-f\s+-r)\b' \
   && echo "$first" | grep -qE '\s(/|~|\$HOME|\.|\*)\s*$|\s(/|~|\$HOME)/?(Users|projects|grid|app|lib|components)\b'; then
  block "recursive rm targeting a real source path. Confirm the exact path."
fi

# 2. Force-push to main — never silent.
if echo "$first" | grep -qE '^\s*git\s+push\b' \
   && echo "$cmd" | grep -qE '(--force|-f)\b' \
   && echo "$cmd" | grep -qE '\bmain\b'; then
  block "force-push to main."
fi

# 3. --no-verify push bypasses the tsc gate.
if echo "$first" | grep -qE '^\s*git\s+push\b' && echo "$cmd" | grep -qE '\-\-no-verify\b'; then
  block "git push --no-verify bypasses the .githooks/pre-push tsc gate. Fix the type error instead."
fi

# 4. git reset --hard / clean -f / checkout -- . — working-tree loss.
if echo "$first" | grep -qE '^\s*git\s+reset\b' && echo "$cmd" | grep -qE '\-\-hard\b'; then
  block "git reset --hard discards working-tree changes. Confirm nothing unsaved is lost."
fi
if echo "$first" | grep -qE '^\s*git\s+clean\b' && echo "$cmd" | grep -qE '\s-[a-z]*f'; then
  block "git clean -f deletes untracked files. Confirm."
fi

# 5. Stripe live-mode CLI write verbs.
if echo "$first" | grep -qE '^\s*stripe\b' \
   && echo "$cmd" | grep -qE '\-\-live\b' \
   && echo "$cmd" | grep -qE '\b(create|update|delete|cancel|refund)\b'; then
  block "Stripe live-mode write — real money. Confirm with the user first."
fi

exit 0
