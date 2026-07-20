import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TowHub — Smart Towing Management Platform",
  description: "AI-powered dispatching, fleet tracking, lead management, and more for towing companies. Manage dispatch, track drivers, capture leads, and grow your towing business.",
  manifest: "/manifest.json",
  keywords: ["towing", "dispatch", "fleet management", "roadside assistance", "tow truck", "GPS tracking", "CRM"],
  authors: [{ name: "TowHub" }],
  openGraph: {
    title: "TowHub — The Operating System for Towing Businesses",
    description: "AI-powered dispatching, fleet tracking, lead management, and more for towing companies.",
    url: "https://towhub.vercel.app",
    siteName: "TowHub",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TowHub",
  },
};

export const viewport: Viewport = {
  themeColor: "#533afd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TowHub" />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen">
        <Providers>
          {children}
        </Providers>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </body>
    </html>
  );
}
