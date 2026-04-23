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
    default: 'GRID — The adaptive workspace for growth',
    template: '%s | GRID',
  },
  description: 'GRID is the adaptive workspace for growth. One environment where brand, operations, and intelligence operate as one system — reading your work, learning your patterns, and producing output that gets clearer every week.',
  keywords: ['adaptive workspace', 'adaptive workspace for growth', 'AI workspace', 'intelligent workspace', 'adaptive work environment', 'AI operations layer', 'AI workflow automation', 'business operating system', 'operational intelligence platform', 'AI that learns', 'workflow quality scoring', 'operational playbook', 'consequence mapping', 'system health monitoring', 'Nova AI agent', 'BYOK AI platform', 'notion alternative', 'monday alternative', 'solo founder tools', 'small team operations'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — The adaptive workspace for growth',
    description: 'The adaptive workspace for growth. One environment where brand, operations, and intelligence operate as one — reading your work, learning your patterns, producing output that gets clearer every week.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — The adaptive workspace for growth',
    description: 'The adaptive workspace for growth. Brand, operations, and intelligence as one system. Built on Claude.',
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
