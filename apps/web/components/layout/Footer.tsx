import Link from "next/link";

/**
 * Authenticated app footer — single bar with brand + copyright + legal links.
 * Brand treatment exactly mirrors the Navbar <Brand /> component:
 *   CELPIP   → white, font-black
 *   BRO      → amber-400, font-black
 * Background matches the navbar: dark navy (#0D0F17) with a top border.
 */
export function Footer() {
  return (
    <footer className="bg-[#0D0F17] border-t border-white/[0.06] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-3">

          {/* Brand — identical two-tone logotype as Navbar */}
          <Link
            href="/"
            className="flex items-center select-none group shrink-0"
            aria-label="CELPIPBRO home"
          >
            <span className="text-lg font-black tracking-tight text-white group-hover:text-white/90 transition-colors">
              CELPIP
            </span>
            <span className="text-lg font-black tracking-tight text-amber-400 group-hover:text-amber-300 transition-colors">
              BRO
            </span>
          </Link>

          {/* Copyright */}
          <p className="text-xs text-white/35 text-center">
            © {new Date().getFullYear()} CELPIPBRO. All rights reserved.
          </p>

          {/* Legal links */}
          <div className="flex items-center gap-4 text-xs text-white/35">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white/70 transition-colors">Contact</Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
