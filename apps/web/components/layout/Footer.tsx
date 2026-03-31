import Link from "next/link";
import { BookOpen, XIcon, Globe } from "lucide-react";

/**
 * Site footer. Shown on all public and authenticated pages.
 * Excluded from practice sessions (which are full-screen).
 */
export function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-primary">
              <BookOpen className="w-5 h-5" />
              <span>CELPIPPro</span>
            </Link>
            <p className="mt-2 text-sm text-subtle leading-relaxed">
              AI-powered CELPIP exam practice for Speaking and Writing.
            </p>
          </div>

          {/* Practice */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Practice</h4>
            <ul className="space-y-2">
              {[
                { href: "/speaking", label: "Speaking Module" },
                { href: "/writing",  label: "Writing Module"  },
                { href: "/history",  label: "Attempt History" },
                { href: "/progress", label: "My Progress"     },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-subtle hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Account</h4>
            <ul className="space-y-2">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/billing",   label: "Plans & Billing" },
                { href: "/sign-in",   label: "Sign In" },
                { href: "/sign-up",   label: "Get Started Free" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-subtle hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              {[
                { href: "/privacy",  label: "Privacy Policy" },
                { href: "/terms",    label: "Terms of Use"   },
                { href: "/contact",  label: "Contact Us"     },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-subtle hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} CELPIPPro. Not affiliated with Paragon Testing Enterprises.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="X (Twitter)" className="text-subtle hover:text-foreground transition-colors">
              <XIcon className="w-4 h-4" />
            </a>
            <a href="#" aria-label="Website" className="text-subtle hover:text-foreground transition-colors">
              <Globe className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
