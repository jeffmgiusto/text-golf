import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Analytics } from "@vercel/analytics/react";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Text Golf - Live PGA Tour Leaderboard",
  description: "ASCII-styled live golf leaderboard with tournament data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.className} antialiased`}>
        <div className="min-h-screen p-2 sm:p-8 overflow-x-hidden">
          <div className="max-w-4xl w-full mx-auto mobile-scale">
            <Navigation />
            {children}
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
