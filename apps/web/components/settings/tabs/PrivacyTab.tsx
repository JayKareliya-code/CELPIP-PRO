"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/PrivacyTab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState }  from "react";
import Link                     from "next/link";
import { Download, ExternalLink, Loader2 } from "lucide-react";

import { Section }        from "@/components/settings/shared/Section";
import { useDataExport }  from "@/components/settings/hooks/useDataExport";

// ── Countdown helper ──────────────────────────────────────────────────────────

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(`${h}h ${m}m remaining`);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <span className="text-xs text-white/40 ml-2">{remaining}</span>;
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function PrivacyTab() {
  const { job, loading, error: exportError, requestExport } = useDataExport();
  const exportInProgress = job?.status === "pending" || job?.status === "processing";

  return (
    <div className="space-y-4">

      {/* ── GDPR data export ───────────────────────────────────────────── */}
      <Section
        title="Download My Data"
        description="Request a copy of all your data — practice attempts, recordings, AI score reports, and billing history. Download link is valid for 24 hours. One export per 24 hours."
      >
        {exportError && (
          <p className="text-sm text-red-400" role="alert">{exportError}</p>
        )}

        {/* Idle — show request button */}
        {!job && (
          <button
            id="btn-request-data-export"
            type="button"
            onClick={requestExport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-primary/20 hover:bg-primary/[0.04] px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white/90 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {loading ? "Requesting…" : "Request data export"}
          </button>
        )}

        {/* In-progress */}
        {job && exportInProgress && (
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Building your export… this may take a minute.
          </div>
        )}

        {/* Complete — download link */}
        {job?.status === "complete" && job.download_url && (
          <div className="flex flex-col gap-1.5">
            <a
              id="link-download-export"
              href={job.download_url}
              download
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white w-fit transition-colors"
            >
              <Download className="w-4 h-4" /> Download my data (.zip)
            </a>
            {job.expires_at && <ExpiryCountdown expiresAt={job.expires_at} />}
          </div>
        )}

        {/* Failed */}
        {job?.status === "failed" && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">
              Export failed: {job.error_message ?? "unknown error"}. Please try again.
            </p>
            <button
              type="button"
              onClick={requestExport}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
            >
              <Download className="w-4 h-4" /> Retry
            </button>
          </div>
        )}
      </Section>

      {/* ── Legal links ────────────────────────────────────────────────── */}
      <Section title="Legal">
        <div className="space-y-2">
          {([
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/terms",   label: "Terms of Service" },
          ] as const).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/55 hover:text-white/90 hover:border-white/[0.14] transition-all"
            >
              <span className="font-medium">{label}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
