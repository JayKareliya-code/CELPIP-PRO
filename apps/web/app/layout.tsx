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

export const metadata: Metadata = {
  title: {
    default: "CELPIPBRO - AI-Powered CELPIP Practice",
    template: "%s | CELPIPBRO",
  },
  description:
    "Practice CELPIP Speaking and Writing tasks with timed sessions, AI feedback, practice band estimates, and progress tracking.",
  keywords: ["CELPIP", "CELPIP practice", "CELPIP speaking", "CELPIP writing", "Canadian English test"],
  icons: {
    icon: [
      { url: "/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png",     sizes: "512x512",  type: "image/png" },
    ],
    shortcut: "/icon-32.png",
    apple:    "/icon-180.png",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: "CELPIPBRO",
    title: "CELPIPBRO - AI-Powered CELPIP Practice",
    description: "Practice CELPIP Speaking and Writing with AI feedback and practice band estimates.",
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
        lang="en"
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
