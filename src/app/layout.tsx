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
  title: "Text Golf — Terminal-Style PGA Tour Leaderboard",
  description:
    "Live PGA Tour scores with a retro ASCII aesthetic. Real-time leaderboards, hole-by-hole scorecards, rankings, and tournament history. No ads, no clutter.",
  openGraph: {
    title: "Text Golf — Terminal-Style PGA Tour Leaderboard",
    description:
      "Live PGA Tour scores with a retro ASCII aesthetic. No ads, no clutter.",
    url: "https://textgolf.io",
    siteName: "Text Golf",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Text Golf - Terminal-style PGA Tour leaderboard showing live scores",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Golf — Terminal-Style PGA Tour Leaderboard",
    description:
      "Live PGA Tour scores with a retro ASCII aesthetic. No ads, no clutter.",
    images: ["/og-image.png"],
  },
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
          <div className="max-w-fit w-full mx-auto mobile-scale">
            <Navigation />
            {children}
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
