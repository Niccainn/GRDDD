---
name: voice-check
description: Use this skill before committing any change that touches user-visible strings — `app/(marketing)/**`, `app/page.tsx`, `app/pricing/page.tsx`, `app/access/page.tsx`, `lib/marketing-cta.ts`, any new shipped string > 10 words. Greps for banned words, emoji, wrong capitalisation (Grid vs GRID), wrong agent name (Nova in user-facing surfaces), exclamation points. Auto-runs the brand-ops checklist before brand-ops formally reviews.
---

# Skill: voice-check

## When to invoke

- About to commit changes to `app/(marketing)/**` or any marketing route
- Adding a new shipped string > 10 words anywhere in `app/**`
- Adding a new component in `components/marketing/**`
- "Audit this for brand", "voice check", "is this on-brand"
- Pre-handoff to `brand-ops` agent (they'll re-run; this catches the obvious ones first)

## Procedure

```bash
# 1. Identify changed files (or pass explicit paths)
FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E "\.(tsx?|md)$")
[ -z "$FILES" ] && FILES=$(git diff --name-only --diff-filter=AM | grep -E "\.(tsx?|md)$")

# 2. Banned marketing words (CLAUDE.md voice rules + BRAND_GUIDELINES Part 2)
BANNED='unleash|empower|supercharge|seamless|revolutionary|intelligent|transformative|next-gen|powerful|robust|comprehensive|state-of-the-art|game-changing|paradigm-shift|cutting-edge'
echo "=== banned words ==="
for f in $FILES; do
  hits=$(grep -niE "$BANNED" "$f" 2>/dev/null)
  [ -n "$hits" ] && echo "$f:" && echo "$hits"
done

# 3. GRID casing (must be uppercase)
echo "=== wrong-case 'Grid' / 'grid' (excluding code identifiers) ==="
for f in $FILES; do
  # Allow inside import paths, attribute values like data-grid, etc.
  hits=$(grep -nE '\b(Grid|grid)\b' "$f" 2>/dev/null | \
    grep -vE 'import .*from|className=|className: |grid-cols|grid-flow|grid-row|grid-template|data-grid|css.grid|display:.*grid')
  [ -n "$hits" ] && echo "$f:" && echo "$hits"
done

# 4. Atrium not Nova in user-facing
echo "=== 'Nova' in user-facing strings ==="
for f in $FILES; do
  # Skip internal lib/ files (Nova→Atrium internal rename is separate work, see docs/NOVA-PURGE-SCOPE.md)
  case "$f" in
    lib/nova/*|lib/nova.ts|app/nova/*|app/api/nova/*|__tests__/*) continue ;;
  esac
  hits=$(grep -nE '\bNova\b' "$f" 2>/dev/null)
  [ -n "$hits" ] && echo "$f:" && echo "$hits"
done

# 5. Emoji (any unicode emoji range)
echo "=== emoji (none allowed in shipped UI) ==="
for f in $FILES; do
  hits=$(grep -nP '[\x{1F300}-\x{1F9FF}\x{2600}-\x{27BF}\x{1F000}-\x{1F1FF}]' "$f" 2>/dev/null)
  [ -n "$hits" ] && echo "$f:" && echo "$hits"
done

# 6. Exclamation points in marketing
echo "=== exclamation points in marketing ==="
for f in $FILES; do
  case "$f" in
    app/\(marketing\)/*|app/page.tsx|app/pricing/*|app/access/*|app/use-cases/*|app/compare/*|app/blog/*) ;;
    *) continue ;;
  esac
  hits=$(grep -n '!' "$f" 2>/dev/null | grep -vE 'className|=|<|>|\{|\}|//')
  [ -n "$hits" ] && echo "$f:" && echo "$hits"
done

echo ""
echo "If all sections above are empty, voice check passes. Hand off to brand-ops for final sign-off."
```

## Verification

Pass = every section returns no output. Fail = any hit needs review:
- Banned words → reword (CLAUDE.md voice rule 1: "memo, not marketing")
- Wrong casing → uppercase GRID, period
- Nova in user-facing → use Atrium (the rename is in flight per `docs/NOVA-PURGE-SCOPE.md`; user-visible should already be Atrium per PR #77)
- Emoji → replace with monoline SVG glyph or remove
- Exclamation → remove (CLAUDE.md voice: "no exclamation points")

## Failure modes

- **False positives on `grid`** — Tailwind classes (`grid-cols-3`), CSS properties (`display: grid`). The grep filter excludes these but new patterns might slip through.
- **`Nova` inside `lib/`** is fine right now — internal rename is separate work. Only flag in user-visible surfaces.
- **Code-comment exclamations** are fine. Filter excludes `//` comments but multi-line `/* */` could leak.
- **Emoji embedded as raw bytes** vs escape sequences — the unicode range catches both, but if a new emoji slips outside the listed ranges, expand the regex.
- **`shipped`-string detection** — a literal string in JSX is shipped; a string in a server-only file may not be. Use judgment for `lib/` server files.

## Owner

`growth` (called by `brand-ops` for final sign-off)
