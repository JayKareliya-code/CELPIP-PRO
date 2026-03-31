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
    default: "CELPIPPro — AI-Powered CELPIP Exam Practice",
    template: "%s | CELPIPPro",
  },
  description:
    "Practice CELPIP Speaking and Writing tasks with AI-powered feedback, rubric-based scoring, and personalized progress tracking. Achieve your target band score.",
  keywords: ["CELPIP", "CELPIP practice", "CELPIP speaking", "CELPIP writing", "Canadian English test"],
  openGraph: {
    type:        "website",
    locale:      "en_CA",
    siteName:    "CELPIPPro",
    title:       "CELPIPPro — AI-Powered CELPIP Exam Practice",
    description: "Practice CELPIP Speaking and Writing with AI feedback and rubric-based scoring.",
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
          {/* Providers wraps the client boundary (React Query, etc.)
              while RootLayout itself stays a Server Component. */}
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

