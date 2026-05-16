#!/usr/bin/env bash
# Claude Code Stop hook for GRID.
#
# Runs when Claude finishes responding. Non-blocking advisory: surfaces
# anything that should not be left dangling at the end of a session.
# Exits 0 always (Stop hooks shouldn't trap the user); prints to stdout
# which Claude sees and can act on or relay.

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" 2>/dev/null || exit 0

notes=()

# 1. Uncommitted changes to tracked files
if ! git diff --quiet 2>/dev/null; then
  changed=$(git diff --name-only | head -5 | tr '\n' ' ')
  notes+=("uncommitted changes: ${changed}")
fi

# 2. Staged-but-uncommitted
if ! git diff --cached --quiet 2>/dev/null; then
  notes+=("staged changes not yet committed")
fi

# 3. .ts/.tsx changes present but tsc not obviously run this session
if git diff --name-only 2>/dev/null | grep -qE '\.(ts|tsx)$'; then
  notes+=("TypeScript files changed — run 'npx tsc --noEmit' before pushing (pre-push hook will enforce, but catch it early)")
fi

# 4. On a feature branch ahead of origin without a push
branch=$(git branch --show-current 2>/dev/null || echo "")
if [ -n "$branch" ] && [ "$branch" != "main" ]; then
  if git status -sb 2>/dev/null | grep -q 'ahead'; then
    notes+=("branch '${branch}' has unpushed commits")
  fi
fi

if [ ${#notes[@]} -gt 0 ]; then
  echo "Session-end check:"
  for n in "${notes[@]}"; do echo "  - $n"; done
fi
exit 0
