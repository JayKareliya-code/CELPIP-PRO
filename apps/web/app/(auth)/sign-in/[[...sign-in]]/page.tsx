import { SignIn } from "@clerk/nextjs";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CELPIPBRO account to continue practising.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted px-4">
      {/* Logo */}
      <Link
        href="/home"
        className="flex items-center gap-2 font-bold text-lg text-primary mb-8 hover:opacity-80 transition-opacity"
      >
        <BookOpen className="w-5 h-5" />
        <span>CELPIPBRO</span>
      </Link>

      {/* Clerk sign-in */}
      <SignIn
        appearance={{
          variables: {
            colorPrimary:     "#4F46E5",
            colorBackground:  "#FFFFFF",
            colorText:        "#111827",
            colorTextSecondary: "#6B7280",
            borderRadius:     "0.5rem",
            fontFamily:       "Inter, system-ui, sans-serif",
          },
          elements: {
            card:           "shadow-panel border border-border",
            formButtonPrimary: "bg-primary hover:bg-primary-hover text-white",
          },
        }}
      />

      <p className="mt-6 text-sm text-subtle">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-primary font-medium hover:underline">
          Get started free
        </Link>
      </p>
    </div>
  );
}
