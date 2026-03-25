import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";

import { SiteShell } from "@/components/site-shell";

import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif"
});

export const metadata: Metadata = {
  title: "BAX Ledger",
  description: "BAX Ledger - a minimalist Clash of Clans player tracking dashboard powered by Supabase."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}


