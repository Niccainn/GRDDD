import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.grddd.com'),
  title: {
    default: 'GRID — The Adaptive Workspace for Modern Teams',
    template: '%s | GRID',
  },
  description: 'GRID is the AI-powered adaptive workspace where teams and AI learn the business together. Automate workflows, gain operational clarity, and scale without adding headcount.',
  keywords: ['adaptive workspace', 'AI business workspace', 'workflow automation', 'project management', 'team collaboration platform', 'business operations software', 'AI workspace', 'work management platform', 'notion alternative', 'monday alternative', 'clickup alternative'],
  authors: [{ name: 'GRID Systems Inc.' }],
  creator: 'GRID Systems Inc.',
  openGraph: {
    title: 'GRID — The Adaptive Workspace for Modern Teams',
    description: 'GRID is the AI-powered adaptive workspace where teams and AI learn the business together. Automate workflows, gain operational clarity, and scale without adding headcount.',
    url: 'https://www.grddd.com',
    siteName: 'GRID',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID — The Adaptive Workspace for Modern Teams',
    description: 'GRID is the AI-powered adaptive workspace where teams and AI learn the business together. Automate workflows, gain operational clarity, and scale without adding headcount.',
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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#08080C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="noise">
        <LayoutShell>{children}</LayoutShell>
        <Analytics />
      </body>
    </html>
  );
}
