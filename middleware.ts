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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Portal data endpoints are token-gated (not session-gated)
  if (pathname.match(/^\/api\/portal\/[^/]+$/)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Allow public paths — but redirect authenticated users away from
  // marketing pages (/, /sign-in, /sign-up) into the app.
  const session = req.cookies.get('grid_session')?.value;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (session && (pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up')) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/dashboard', req.url))
      );
    }
    return withSecurityHeaders(NextResponse.next());
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
    return withSecurityHeaders(NextResponse.next());
  }

  // Check session cookie (already read above for public-path redirect)
  if (!session) {
    // API routes get 401
    if (pathname.startsWith('/api/')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }
    // Pages redirect to sign-in
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/sign-in', req.url))
    );
  }

  // Redirect un-onboarded users to /welcome (skip for API routes, the
  // welcome page itself, and pricing). The onboarded cookie is set by
  // /api/onboarding/complete alongside Identity.onboardedAt in the DB.
  // Using a cookie avoids a DB round-trip on every middleware invocation.
  const onboarded = req.cookies.get('grid_onboarded')?.value;
  if (
    !onboarded &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/welcome') &&
    pathname !== '/pricing'
  ) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/welcome', req.url))
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
