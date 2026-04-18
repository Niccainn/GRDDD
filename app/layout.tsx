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
    default: 'GRID — The Adaptive Workspace for Modern Teams',
    template: '%s | GRID',
  },
  description: 'I built GRID because the way businesses operate is fundamentally changing — and the tools haven\'t caught up. Processes are in demand to evolve, but the feedback loop between decision and outcome has been blurred by speed and fragmentation. GRID gives companies the time and structure to consider the outcome of every process — from manual systems to automated ones, with human input at every step.',
  keywords: ['adaptive workspace', 'AI business workspace', 'workflow automation', 'process intelligence', 'business operations OS', 'AI workflow engine', 'operational clarity', 'feedback loop automation', 'notion alternative', 'monday alternative', 'clickup alternative'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — The Adaptive Workspace for Modern Teams',
    description: 'I built GRID because the way businesses operate is fundamentally changing — and the tools haven\'t caught up. GRID gives companies the structure to consider the outcome of every process, with human input at every step.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — The Adaptive Workspace for Modern Teams',
    description: 'I built GRID because the way businesses operate is fundamentally changing — and the tools haven\'t caught up. GRID gives companies the structure to consider the outcome of every process, with human input at every step.',
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
    'theme-color': '#15AD70',
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
