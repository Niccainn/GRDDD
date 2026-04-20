#!/usr/bin/env bash
# Renders live-app screenshots of the marketing demo user's view on grddd.com.
# Seeds the demo account via seed-marketing-demo.mjs, extracts the session
# token, then drives headless Chrome through each key route with that cookie
# set. Writes 10 × 1920×1080 PNGs to public/marketing/live/.
#
#   bash scripts/render-marketing-screens.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$HERE/.."
OUT="$ROOT/public/marketing/live"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_URL="${BASE_URL:-https://grddd.com}"

mkdir -p "$OUT"

echo "→ Seeding demo data in production DB…"
set -a; source "$ROOT/.env.vercel"; set +a
OUTPUT=$(node "$HERE/seed-marketing-demo.mjs")
echo "$OUTPUT" | tail -5

TOKEN=$(echo "$OUTPUT" | grep "^SESSION_TOKEN=" | cut -d= -f2)
if [[ -z "$TOKEN" ]]; then
  echo "✗ Could not extract session token"
  exit 1
fi
echo "→ Session token: ${TOKEN:0:16}…"
echo ""

# Routes to capture. Each line: filename|path|wait_ms
ROUTES=(
  "01-dashboard|/dashboard|2500"
  "02-systems|/systems|2000"
  "03-operations-detail|/operations||2000"
  "04-workflows|/workflows|2000"
  "05-calendar|/calendar|2500"
  "06-analytics|/analytics|2500"
  "07-integrations|/integrations|2500"
  "08-settings-ai|/settings/ai|2000"
  "09-tasks|/tasks|2000"
  "10-goals|/goals|2000"
)

# Write a cookie file Chrome can load
COOKIE_DIR="$(mktemp -d)"
COOKIE_FILE="$COOKIE_DIR/cookies.txt"

# Chrome needs Netscape cookie format. Domain must match (.grddd.com for subdomains).
DOMAIN=$(echo "$BASE_URL" | sed -E 's|https?://||')
cat > "$COOKIE_FILE" <<EOF
# Netscape HTTP Cookie File
$DOMAIN	FALSE	/	TRUE	$(date -v+1d +%s)	grid_session	$TOKEN
EOF

# Chrome headless accepts --user-data-dir for persistent cookies.
USER_DIR="$(mktemp -d)"
mkdir -p "$USER_DIR/Default"

# Seed the user-data-dir with the session cookie via Chrome's cookie DB format
# isn't easy from bash. Instead, use Chrome's --disk-cache-dir + a small
# bootstrapping HTML page that sets document.cookie, then navigates.
BOOTSTRAP="$COOKIE_DIR/set-cookie.html"
cat > "$BOOTSTRAP" <<HTML
<!DOCTYPE html><meta charset="utf-8"><title>setup</title>
<script>
  // Set the session cookie for the grddd.com domain, then marker.
  document.cookie = "grid_session=$TOKEN; path=/; max-age=86400; samesite=lax; secure";
  document.title = "READY";
</script>
HTML

# Simpler path: use Chrome's --screenshot with the cookie injected via remote
# debugging. Easier still: use the cookies.txt with curl to confirm auth, then
# skip bootstrap and use Chrome with a custom user-data-dir where we write
# cookies via a puppeteer-lite approach — but we don't have puppeteer.
#
# Cleanest working approach: use Chrome's --remote-debugging-port with a node
# script. Since we don't have puppeteer either, we use a minimal CDP client
# via curl to the devtools protocol. But that's heavy. Let's use the old
# trick: pass the cookie via a data URL with a redirect, then Chrome follows.
#
# Actually the MOST reliable: use Chrome with the --user-data-dir, first
# navigate to BASE_URL with the bootstrap HTML (which sets document.cookie
# for the origin), then render the target URL. Since --user-data-dir
# persists cookies, the second navigation carries them.

echo "→ Priming session cookie in Chrome profile…"
"$CHROME" --headless=new --disable-gpu \
  --user-data-dir="$USER_DIR" \
  --virtual-time-budget=1500 \
  --screenshot=/dev/null \
  "$BASE_URL/api/auth/set-session-marketing?token=$TOKEN" 2>/dev/null || true

# Fallback: directly use the DevTools protocol via node + raw websocket is
# too heavy. Instead, write cookies directly to Chrome's Cookies SQLite
# database in the user-data-dir. Chrome 120+ uses a JSON-like encrypted
# format that's not trivial to write. SO — the simplest path that actually
# works: just use --header to pass a Cookie header via Chrome. Chrome
# headless supports --header-inject? Actually no. But we can use the older
# flag --extra-headers via --user-agent-override isn't it either.
#
# FINAL WORKING APPROACH: use curl to prove the session works end-to-end,
# then if Chrome refuses to load the cookie, we fall back to hitting each
# page via a local proxy that injects the Cookie header. But that's heavy.
#
# Actually: Chrome headless in recent versions DOES read --user-data-dir
# cookies. The issue is writing them. Path of least resistance:
#   1. Use `curl` to fetch each page with the cookie and save HTML
#   2. Use Chrome headless on localhost:8080 (a tiny python http server
#      serving the fetched HTML) to render the final PNG
# This splits auth from render. But CSS/JS relative paths break.
#
# THE actually simplest path: --virtual-authentication-wait + cookie URL arg?
# No. Let's use Chrome's --remote-debugging-port + a 40-line Node script
# using only the built-in `ws` protocol via a raw socket. Too much code.
#
# OK, pragmatic: we use Puppeteer after all. Install it temporarily.

echo "→ Installing puppeteer (one-time, to a scratch dir)…"
SCRATCH="$(mktemp -d)"
cd "$SCRATCH"
npm init -y >/dev/null 2>&1
npm install puppeteer --silent --no-audit --no-fund 2>&1 | tail -2
cd - >/dev/null

cat > "$SCRATCH/render.mjs" <<'JS'
import puppeteer from 'puppeteer';

const TOKEN = process.env.GRID_TOKEN;
const BASE  = process.env.GRID_BASE;
const OUT   = process.env.GRID_OUT;
const ROUTES = JSON.parse(process.env.GRID_ROUTES);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();

// Set session + onboarded cookies so middleware doesn't bounce us to /welcome.
// Also set grid_consent so the cookie banner doesn't clutter the shot.
const domain = new URL(BASE).hostname;
await page.setCookie(
  { name: 'grid_session',   value: TOKEN, domain, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  { name: 'grid_onboarded', value: '1',   domain, path: '/', httpOnly: true, secure: true, sameSite: 'Strict' },
  { name: 'grid_consent',   value: 'all', domain, path: '/', secure: true, sameSite: 'Lax' },
);

// Suppress the sample-data banner via localStorage before the app boots.
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('grid_sample_banner_dismissed', '1');
    localStorage.setItem('grid:calendar-banner-dismissed', '1');
    localStorage.setItem('grid:just-onboarded-cleared', '1');
    localStorage.setItem('grid:onboarding-complete', 'true');
  } catch {}
});

for (const r of ROUTES) {
  const [name, path, waitStr] = r.split('|');
  const wait = parseInt(waitStr, 10) || 2000;
  const url = BASE + path;
  process.stdout.write(`  ${name}  ${url}  `);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(res => setTimeout(res, wait));
    await page.screenshot({ path: `${OUT}/grid-live-${name}.png`, omitBackground: false });
    console.log('✓');
  } catch (e) {
    console.log('✗ ' + e.message.slice(0, 80));
  }
}
await browser.close();
JS

echo ""
echo "→ Rendering 10 live screens…"
GRID_TOKEN="$TOKEN" GRID_BASE="$BASE_URL" GRID_OUT="$OUT" \
  GRID_ROUTES="$(printf '%s\n' "${ROUTES[@]}" | python3 -c 'import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')" \
  node "$SCRATCH/render.mjs"

rm -rf "$COOKIE_DIR" "$USER_DIR"
echo ""
echo "✓ Live screens in $OUT"
ls -lh "$OUT"
