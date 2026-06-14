import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "600"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://celpipbro.ca";

export const metadata: Metadata = {
  // ── Base URL (required for all absolute OG / Twitter image URLs) ────────────
  metadataBase: new URL(SITE_URL),

  // ── Titles ──────────────────────────────────────────────────────────────────
  title: {
    default: "CELPIPBRO - AI-Powered CELPIP Practice",
    template: "%s | CELPIPBRO",
  },

  // ── Description & Keywords ──────────────────────────────────────────────────
  description:
    "Practice CELPIP Speaking and Writing tasks with timed sessions, AI feedback, practice band estimates, and progress tracking.",
  keywords: [
    "CELPIP",
    "CELPIP practice",
    "CELPIP speaking practice",
    "CELPIP writing practice",
    "CELPIP test prep",
    "CELPIP band score",
    "CELPIP AI feedback",
    "Canadian English test",
    "CELPIP General",
    "CELPIP mock test",
    "CELPIP online practice",
    "CELPIPBRO",
  ],

  // ── Canonical & Alternate URLs ───────────────────────────────────────────────
  alternates: {
    canonical: "/",
  },

  // ── Robots directive ────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // ── Google Search Console Verification ──────────────────────────────────────
  verification: {
    google: "ntqSl4kE9qClED8xd_Q2K9CsJV-M8VvbknvYXDMBkpc",
  },

  // ── Icons ───────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png",     sizes: "512x512",  type: "image/png" },
    ],
    shortcut: "/icon-32.png",
    apple:    "/icon-180.png",
  },

  // ── Open Graph ──────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: "CELPIPBRO",
    title: "CELPIPBRO - AI-Powered CELPIP Practice",
    description:
      "Practice CELPIP Speaking and Writing with AI feedback and practice band estimates.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CELPIPBRO — AI-Powered CELPIP Practice",
      },
    ],
  },

  // ── Twitter / X Card ────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "CELPIPBRO - AI-Powered CELPIP Practice",
    description:
      "Practice CELPIP Speaking and Writing with AI feedback and practice band estimates.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en-CA"
        className={`${inter.variable} ${sourceSerif.variable} dark`}
        suppressHydrationWarning
      >
        <body className="min-h-screen flex flex-col bg-muted font-sans antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
