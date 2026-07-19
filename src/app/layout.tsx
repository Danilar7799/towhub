import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TowHub — Smart Towing Management Platform",
  description: "AI-powered dispatching, fleet tracking, lead management, and more for towing companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
