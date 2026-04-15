import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/tasks',
          '/workflows',
          '/systems',
          '/environments',
          '/settings',
          '/nova',
          '/onboarding',
          '/welcome',
          '/docs',
          '/goals',
          '/finance',
          '/executions',
          '/agents',
          '/calendar',
          '/inbox',
          '/reports',
          '/analytics',
          '/automations',
          '/integrations',
          '/forms',
          '/views',
          '/assets',
          '/approvals',
          '/audit',
          '/time',
          '/traces',
        ],
      },
    ],
    sitemap: 'https://www.grddd.com/sitemap.xml',
  };
}
