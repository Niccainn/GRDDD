import { NextRequest, NextResponse } from 'next/server';

// Public paths — accessible without an authenticated session.
// Legal pages (privacy, terms) MUST be public: users need to read them
// before signing up, and search engines + regulators need to crawl them.
// Auth endpoints are public so users can sign in/up. Webhook and cron
// endpoints are public because they're gated by their own shared-secret
// tokens rather than by the session cookie.
const PUBLIC_PATHS = [
  '/',
  '/access',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/pricing',
  '/compare',
  '/use-cases',
  '/blog',
  '/offline',
  '/portal',
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/sign-out',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/demo',
  '/api/auth/providers',
  '/api/auth/oauth',
  '/api/v1/',
  '/api/webhooks/slack',
  '/api/workflows/webhook',
  '/api/cron/tick',
  '/api/cron/agents',
  '/api/health',
  '/api/waitlist',
  '/f',
  '/api/forms/submit',
  '/api/waitlist',
];

// Security headers applied to every response. Bare minimum for a
// production web app in 2026:
//
//   - HSTS: force https for a year, include subdomains, preload-eligible
//   - X-Frame-Options DENY: no clickjacking via iframe
//   - X-Content-Type-Options nosniff: no MIME-sniffing surprises
//   - Referrer-Policy strict-origin-when-cross-origin: don't leak full
//     URLs (which may contain tokens) to third-party destinations
//   - Permissions-Policy: lock down sensor/camera/mic/geo by default
//   - CSP: environment-aware. Dev allows 'unsafe-eval' because Next.js
//     Fast Refresh and the React error overlay require runtime code
//     evaluation. Production drops it — the compiled bundle has no eval
//     dependency. Both tiers keep 'unsafe-inline' for style-src because
//     Next.js injects <style> tags at hydration time; script-src uses
//     'unsafe-inline' as a fallback until we wire a per-request nonce
//     pipeline (acceptable tradeoff: the inline scripts are first-party
//     hydration glue, not user-generated content).
//
// CSRF protection comes from the session cookie: httpOnly +
// sameSite=strict (see lib/auth.ts). A cross-origin form post cannot
// carry the cookie, so an attacker page cannot authenticate a
// state-changing POST as the victim.

const isDev = process.env.NODE_ENV !== 'production';

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': [
    "default-src 'self'",
    // Dev: 'unsafe-eval' required by Next.js Fast Refresh + React
    // error overlay. Production: dropped — compiled bundles never eval.
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    // img-src allows https: universally so Google profile avatars
    // (lh3.googleusercontent.com) and any future OAuth provider icons
    // render without CSP violations.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

/**
 * SEC-10 — default Cache-Control on API responses.
 *
 * Authenticated JSON must never land in a shared cache (CDN, ISP,
 * browser back/forward cache). We set private + no-store on any
 * /api/* response that doesn't already have Cache-Control. Routes
 * that want to cache (e.g. public blog fetchers) can override by
 * setting the header explicitly in their own handler.
 *
 * Static + page responses keep Next.js defaults — those are already
 * safe (Vercel handles cache semantics for RSC / static assets).
 */
function withCacheControl(res: NextResponse, pathname: string): NextResponse {
  if (pathname.startsWith('/api/') && !res.headers.has('Cache-Control')) {
    res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  return res;
}

/**
 * SEC-12 — belt-and-suspenders CSRF protection for state-changing
 * /api/* requests. SameSite=Lax on the session cookie blocks most
 * cross-origin form POSTs already; this adds a server-side Origin /
 * Referer check so we don't depend solely on the browser's cookie
 * behavior.
 *
 * Webhook endpoints are exempt — they authenticate via provider
 * signatures and are expected to arrive without an Origin header.
 * Public sign-in / sign-up stay exempt for the same browser-behavior
 * reason as SameSite: some flows legitimately come from different
 * origins (e.g. "sign in with Google" redirecting back via a 302
 * with no Origin), and those are already rate-limited + auth'd.
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',
  '/api/billing/webhook',
  '/api/v1/', // public API with bearer token auth
  '/api/cron/', // cron secret auth
  '/api/portal/', // token auth
  '/api/forms/submit', // public form submissions, rate-limited
  '/api/waitlist',
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/oauth/',
  // OAuth integration kickoff has its own SEC-06 origin check and
  // is a GET (state-changing but driven by browser navigation).
  '/api/integrations/oauth/',
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p));
}

function hasSameOriginIntent(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true; // safe methods, no CSRF exposure
  }
  const canonical = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (!canonical) return true; // dev with no canonical — permit

  const origin = req.headers.get('origin');
  if (origin && origin.replace(/\/$/, '') === canonical) return true;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin.replace(/\/$/, '');
      if (refOrigin === canonical) return true;
    } catch {
      /* malformed — reject below */
    }
  }

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // SEC-12 — CSRF protection on state-changing API requests.
  // Runs before any other auth/redirect logic so a cross-origin
  // attack gets 403'd immediately.
  if (pathname.startsWith('/api/') && !isCsrfExempt(pathname) && !hasSameOriginIntent(req)) {
    return withCacheControl(
      withSecurityHeaders(
        NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }),
      ),
      pathname,
    );
  }

  // Portal data endpoints are token-gated (not session-gated)
  if (pathname.match(/^\/api\/portal\/[^/]+$/)) {
    return withCacheControl(withSecurityHeaders(NextResponse.next()), pathname);
  }

  // Allow public paths — but redirect authenticated users away from
  // marketing pages (/, /sign-in, /sign-up) into the app.
  const session = req.cookies.get('grid_session')?.value;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (session && (pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up')) {
      // Resolve final destination in one hop to avoid redirect chains
      const onboarded = req.cookies.get('grid_onboarded')?.value;
      const dest = onboarded ? '/dashboard' : '/welcome';
      return withSecurityHeaders(
        NextResponse.redirect(new URL(dest, req.url))
      );
    }
    return withCacheControl(withSecurityHeaders(NextResponse.next()), pathname);
  }

  // Allow static files and generated assets (icon, apple-icon, opengraph-image, etc.)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/apple-icon') ||
    pathname.startsWith('/opengraph-image') ||
    pathname.startsWith('/icon') ||
    pathname.includes('.')
  ) {
    return withCacheControl(withSecurityHeaders(NextResponse.next()), pathname);
  }

  // Check session cookie (already read above for public-path redirect)
  if (!session) {
    // API routes get 401
    if (pathname.startsWith('/api/')) {
      return withCacheControl(
        withSecurityHeaders(
          NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
        pathname,
      );
    }
    // Pages redirect to sign-in
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/sign-in', req.url))
    );
  }

  // Redirect un-onboarded users to /welcome (skip for API routes, the
  // Onboarding is NON-BLOCKING. Prior behaviour force-redirected
  // every request from a non-onboarded user to /welcome — which
  // re-fired the whole wizard on any state that briefly lost the
  // grid_onboarded cookie (OAuth callbacks, Safari ITP, tab-session
  // loss). Users reported having to "redo onboarding after connecting
  // a calendar" because of this.
  //
  // New behaviour: the user can use the app at any time. When they
  // haven't completed onboarding yet, an in-app checklist shows on
  // the dashboard (OnboardingChecklist component) with resumable
  // progress — matching the Notion / ClickUp / Monday pattern.
  // Middleware only redirects on a first-time hit to /dashboard
  // right after signup, which is handled client-side now.
  return withCacheControl(withSecurityHeaders(NextResponse.next()), pathname);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
