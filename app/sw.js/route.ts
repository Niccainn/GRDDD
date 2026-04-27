/**
 * GRID Service Worker — served as a Next.js route handler so the
 * cache version can be bumped automatically on every deploy.
 *
 * Why this isn't /public/sw.js anymore:
 *   The static file used a hardcoded `CACHE_NAME = 'grid-v1'` that
 *   never changed. Browsers therefore reused the same cache across
 *   deploys, serving stale HTML/JS to returning users until a hard
 *   reload. After the 2026-04-26 fix push (PRs #39–#43), users still
 *   landed on the env page despite the new sign-in code being live —
 *   their cached SW was serving the old behavior.
 *
 *   Bumping CACHE_NAME per deploy means each new build has a fresh
 *   cache identity, the activate handler clears the old cache, and
 *   users see new code on next page load.
 *
 * Why a route handler not a build-time template:
 *   We don't have a `prebuild` script that touches /public; adding
 *   one would couple to Vercel's CI invocation order. A route
 *   handler reads env at runtime — simpler, no extra build step.
 *
 * Cache key strategy:
 *   - VERCEL_GIT_COMMIT_SHA — Vercel sets this automatically on every
 *     deploy. Stable for a given build, fresh on every push to main.
 *   - Falls back to a string literal locally (npm run dev) so devs
 *     don't see a fresh-cache reload on every restart.
 *
 * Headers:
 *   Cache-Control: no-cache forces the browser to revalidate the SW
 *   itself on every page load. Without this, the browser caches the
 *   sw.js response and your fix never reaches the user.
 *   Service-Worker-Allowed: '/' lets the script register at root scope.
 */

import { NextResponse } from 'next/server';

const SW_TEMPLATE = `// GRID Service Worker — offline shell caching
// CACHE_NAME is injected per-deploy by app/sw.js/route.ts.
const CACHE_NAME = '__CACHE_NAME__';
const OFFLINE_URL = '/offline';

// Cache the app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/dashboard', '/offline'])
    )
  );
  self.skipWaiting();
});

// Clean up old caches — every previously-deployed CACHE_NAME goes
// here when the new SW activates. Net effect: each deploy gives
// returning users a fresh cache, no manual hard-reload required.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for pages (not API calls or static assets)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful page navigations
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});
`;

export async function GET() {
  // Vercel exposes the build SHA as VERCEL_GIT_COMMIT_SHA on every
  // deployment. Truncate to 7 chars for readability — uniqueness
  // doesn't need 40.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const cacheName = sha ? `grid-${sha}` : 'grid-dev';

  const body = SW_TEMPLATE.replace('__CACHE_NAME__', cacheName);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Force the browser to revalidate the SW itself on every page
      // load. Without this, our fix never reaches the user.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}

// Force this to run at request time (default for App Router route
// handlers, but explicit guards against future "static export" PRs).
export const dynamic = 'force-dynamic';
