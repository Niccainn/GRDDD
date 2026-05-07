import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname ?? __dirname),
  },
  // Standalone output for Docker/serverless deployments
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Image optimization — allow remote images from any source (user-uploaded)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Optimize for production
  poweredByHeader: false,
  reactStrictMode: true,
};

// Wrap the config with Sentry's build plugin when SENTRY_DSN is set.
// Without the DSN we ship vanilla Next so dev / preview builds aren't
// burdened with a sourcemap upload pass that has nowhere to go.
async function buildConfig(): Promise<NextConfig> {
  if (!process.env.SENTRY_DSN || !process.env.SENTRY_AUTH_TOKEN) {
    return nextConfig;
  }
  const { withSentryConfig } = await import('@sentry/nextjs');
  return withSentryConfig(nextConfig, {
    // Sentry org + project are required to upload sourcemaps. The
    // auth token (SENTRY_AUTH_TOKEN) is read by the plugin from env.
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Suppress build-time logs unless something actually fails. Vercel
    // build logs are noisy enough.
    silent: true,
    // Strip Sentry imports from the client bundle when DSN is absent
    // so users never download dead code.
    disableLogger: true,
  });
}

// Next.js can take a sync or async config function. We use the async
// variant so the import('@sentry/nextjs') happens once at boot.
export default buildConfig();
