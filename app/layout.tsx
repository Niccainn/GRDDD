import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import AlertCenter from "@/components/AlertCenter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GRID",
  description: "Adaptive organizational infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <CommandPalette />
          <main className="flex-1 overflow-y-auto" style={{ marginLeft: '220px' }}>
            {/* Top bar with alert center */}
            <div className="sticky top-0 z-30 flex items-center justify-end px-6 py-3 pointer-events-none"
              style={{ background: 'transparent' }}>
              <div className="pointer-events-auto">
                <AlertCenter />
              </div>
            </div>
            <div style={{ marginTop: '-52px' }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
