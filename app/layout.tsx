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
    default: 'GRID — AI That Learns How Your Business Works',
    template: '%s | GRID',
  },
  description: 'GRID maps your business as interconnected systems, runs multi-stage AI workflows, and builds an operational playbook from every execution. 110+ integrations, predictive consequence mapping, and a metacognitive feedback loop that makes your operations smarter over time.',
  keywords: ['AI operations layer', 'operational intelligence platform', 'AI workflow automation', 'business operating system', 'metacognitive AI', 'predictive business operations', 'AI that learns', 'workflow quality scoring', 'operational playbook', 'consequence mapping', 'system health monitoring', 'Nova AI agent', 'BYOK AI platform', 'notion alternative', 'monday alternative', 'solo founder tools', 'small team operations'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — AI That Learns How Your Business Works',
    description: 'Map your business as systems. Run AI workflows. Review output quality. Watch your operational playbook build itself. 110+ integrations, predictive consequence mapping, and AI that gets smarter with every run.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — AI That Learns How Your Business Works',
    description: 'Not a task tool. Not a copilot. The operations layer that maps your business, runs AI workflows, and builds an operational playbook from real execution data.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="noise">
        <LayoutShell>{children}</LayoutShell>
        <ConsentGatedAnalytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
