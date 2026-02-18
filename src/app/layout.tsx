import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

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
        <div className="min-h-screen p-4 sm:p-8 overflow-x-auto">
          <div className="max-w-4xl w-fit mx-auto">
            <Navigation />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
