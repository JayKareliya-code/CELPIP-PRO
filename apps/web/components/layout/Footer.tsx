import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * Minimal authenticated footer — single bar with copyright + legal links.
 * The full marketing footer is only needed on public/landing pages.
 */
export function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-1.5 font-semibold text-sm text-primary">
          <BookOpen className="w-4 h-4" />
          CELPIPPro
        </Link>

        {/* Copyright */}
        <p className="text-xs text-subtle">
          © {new Date().getFullYear()} CELPIPPro · Not affiliated with Paragon Testing Enterprises.
        </p>

        {/* Minimal links */}
        <div className="flex items-center gap-4 text-xs text-subtle">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms"   className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
