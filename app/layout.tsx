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
    default: 'GRID — The nervous system your company has been missing',
    template: '%s | GRID',
  },
  description: 'A living business OS built on Claude. Reads your company, acts with your permission, proves its work. Not a dashboard, not a chatbot, not a workflow builder — the substrate underneath all three.',
  keywords: ['AI operations layer', 'operational intelligence platform', 'AI workflow automation', 'business operating system', 'metacognitive AI', 'predictive business operations', 'AI that learns', 'workflow quality scoring', 'operational playbook', 'consequence mapping', 'system health monitoring', 'Nova AI agent', 'BYOK AI platform', 'notion alternative', 'monday alternative', 'solo founder tools', 'small team operations'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — The nervous system your company has been missing',
    description: 'Reads your company. Acts with your permission. Proves its work. A living business OS built on Claude — not a dashboard, not a chatbot, not a workflow builder.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — The nervous system your company has been missing',
    description: 'The nervous system your company has been missing. Reads, acts, proves its work. Built on Claude.',
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
