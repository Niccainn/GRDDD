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
  // Optimize for production
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
