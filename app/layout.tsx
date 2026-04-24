import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import ConsentGatedAnalytics from "@/components/ConsentGatedAnalytics";
import { Analytics } from "@vercel/analytics/next";
import ConsentBanner from "@/components/ConsentBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.grddd.com'),
  title: {
    default: 'GRID — A workspace that acts',
    template: '%s | GRID',
  },
  description: 'Type what you want done. Nova writes the plan. Your tools do the work. A living business OS where every AI action explains itself, reverses in one click, and teaches Nova what "good" looks like in your company.',
  keywords: ['AI workspace', 'AI interaction layer', 'multi-tool AI', 'AI operations layer', 'AI workflow automation', 'business operating system', 'operational intelligence platform', 'AI that learns', 'workflow quality scoring', 'operational playbook', 'Nova AI agent', 'BYOK AI platform', 'Claude business OS', 'notion alternative', 'solo founder tools', 'small team operations'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — A workspace that acts',
    description: 'Type what you want done. Nova writes the plan, your tools do the work — Figma, Canva, Notion, Gmail, Slack, Meta Ads. Every step is traceable, reversible, and teaches Nova what "good" looks like in your company. Built on Claude.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — A workspace that acts',
    description: 'Type what you want done. Nova writes the plan. Your tools do the work. Built on Claude.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GRID',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#C8F26B',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#08080C',
};

/**
 * Theme init script — runs synchronously in <head> before any paint.
 *
 * Default is dark, full stop. Only flips to light if the user has
 * explicitly chosen it from the preferences UI (either legacy
 * `grid-theme` key from the ThemeToggle or the canonical `grid:theme`
 * key from /settings/preferences). System `prefers-color-scheme` is
 * DELIBERATELY IGNORED — the brand is dark; a phone set to light mode
 * should not automatically flip GRID to light the first time a user
 * opens it.
 *
 * Inlining this is the only way to avoid a FOUC between SSR render
 * and client hydration.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('grid:theme') || localStorage.getItem('grid-theme');
    var theme = stored === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="noise">
        <LayoutShell>{children}</LayoutShell>
        <ConsentGatedAnalytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
