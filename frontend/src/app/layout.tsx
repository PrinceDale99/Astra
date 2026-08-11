import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astra Repo | Zero-Knowledge Tri-Party Treasury Repo on Stellar",
  description: "Secure, institutional tokenized treasury overnight repo markets built natively on Stellar Soroban utilizing CAP-80 host primitives and Groth16 zero-knowledge proofs.",
};

import { BackendWakeup } from "@/components/layout/BackendWakeup";
import { SmoothScroll } from "@/components/layout/SmoothScroll";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        {/* Preconnect to Google Fonts API */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${spaceGrotesk.variable} min-h-full flex flex-col bg-black text-white`}>
        <BackendWakeup />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
