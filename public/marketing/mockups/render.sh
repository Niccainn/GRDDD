#!/usr/bin/env bash
# Render the 10-slide mockups.html to a tall 1920x10800 PNG, then crop each
# 1080-tall band into its own file. One PNG per slide — drop-in for pitch
# decks, ads, social, landing marquee. Uses headless Chrome + sips (macOS).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../png"
mkdir -p "$OUT"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

FULL="$OUT/_full.png"

echo "→ Rendering full gallery (1920x10800) …"
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --default-background-color=0 \
  --window-size=1920,10800 \
  --virtual-time-budget=4000 \
  --screenshot="$FULL" \
  "file://$HERE/mockups.html" 2>/dev/null

echo "→ Slicing into 10 × 1920x1080 PNGs …"
for i in $(seq 1 10); do
  y=$(( (i - 1) * 1080 ))
  out=$(printf "%s/grid-mockup-%02d.png" "$OUT" "$i")
  # macOS sips crops with --cropOffset y x and --cropToHeightWidth
  sips --cropToHeightWidth 1080 1920 --cropOffset "$y" 0 "$FULL" --out "$out" >/dev/null 2>&1 \
    || magick "$FULL" -crop "1920x1080+0+$y" "$out" 2>/dev/null
  echo "   $out"
done

rm -f "$FULL"
echo ""
echo "✓ Done. Marketing PNGs:"
ls -lh "$OUT" | tail -n +2
