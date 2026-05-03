// ─────────────────────────────────────────────────────────────────────────────
// app/admin/calibration/page.tsx — Calibration Manager
//
// Two sections:
//   1. Prompt Anchors (primary) — all speaking + writing prompts with their
//      Band 12 anchor status. Admins can add/edit anchors inline.
//   2. Global Fallback Pool — the calibration_samples table used when a prompt
//      has no prompt-specific anchor.
//
// No mock data. Fully live. Auth guard in app/admin/layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect }  from "react";
import { useAuth }                        from "@clerk/nextjs";
import { Database, ChevronDown, ChevronUp } from "lucide-react";
import { Navbar }                         from "@/components/layout/Navbar";
import { Footer }                         from "@/components/layout/Footer";
import { AdminSidebar }                   from "@/components/admin/AdminSidebar";
import { PromptAnchorTable }              from "@/components/admin/PromptAnchorTable";
import { CalibrationSampleTable }         from "@/components/admin/CalibrationSampleTable";
import { listCalibrationSamples }         from "@/lib/admin/calibrationApi";
import type { CalibrationSample }         from "@/lib/types";

export default function AdminCalibrationPage() {
  const { getToken } = useAuth();

  // ── Global pool state ─────────────────────────────────────────────────────
  const [poolSamples,    setPoolSamples]    = useState<CalibrationSample[]>([]);
  const [poolLoading,    setPoolLoading]    = useState(true);
  const [poolError,      setPoolError]      = useState<string | null>(null);
  const [poolRefreshKey, setPoolRefreshKey] = useState(0);
  const [poolExpanded,   setPoolExpanded]   = useState(false);

  const loadPool = useCallback(async () => {
    setPoolLoading(true);
    setPoolError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await listCalibrationSamples(token);
      setPoolSamples(data);
    } catch (err) {
      setPoolError(err instanceof Error ? err.message : "Failed to load global pool.");
    } finally {
      setPoolLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (poolExpanded) loadPool();
  }, [loadPool, poolRefreshKey, poolExpanded]);

  const handlePoolRefresh = useCallback(() => setPoolRefreshKey((k) => k + 1), []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <main className="flex-1 overflow-auto bg-muted px-6 py-8 w-full">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Calibration</h1>
              <p className="text-sm text-subtle mt-1 max-w-2xl">
                Manage the Band 12 calibration anchors used by the AI scorer.
                Prompt-level anchors take priority over the global fallback pool.
              </p>
            </div>

            {/* ── Section 1: Prompt Anchors (primary) ──────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    Prompt-Level Anchors
                    <span className="text-xs font-medium text-subtle bg-muted px-2 py-0.5 rounded-full border border-border">
                      Primary
                    </span>
                  </h2>
                  <p className="text-xs text-subtle mt-0.5">
                    When a prompt has a Band 12 anchor, the AI uses it as its sole calibration
                    reference — overriding the global pool entirely.
                  </p>
                </div>
              </div>

              <PromptAnchorTable />
            </section>

            {/* ── Divider ──────────────────────────────────────────────────── */}
            <div className="border-t border-border" />

            {/* ── Section 2: Global Fallback Pool (collapsible) ────────────── */}
            <section className="space-y-4">
              <button
                onClick={() => setPoolExpanded((v) => !v)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-start gap-3 text-left">
                  <Database className="w-4 h-4 text-subtle mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      Global Fallback Pool
                      <span className="text-xs font-medium text-subtle bg-muted px-2 py-0.5 rounded-full border border-border">
                        Fallback
                      </span>
                    </h2>
                    <p className="text-xs text-subtle mt-0.5">
                      General-purpose reference responses used when a prompt has <strong>no
                      prompt-specific anchor</strong>. Less accurate than prompt-level anchors but
                      better than no calibration at all.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-subtle group-hover:text-foreground transition-colors">
                  {poolExpanded
                    ? <ChevronUp  className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </button>

              {poolExpanded && (
                <div className="space-y-4">
                  {poolLoading && poolSamples.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-subtle text-sm gap-2">
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                      Loading global pool…
                    </div>
                  ) : poolError ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-center text-sm text-danger">
                      {poolError}
                      <button onClick={handlePoolRefresh} className="block mx-auto mt-2 text-primary hover:underline text-xs">
                        Try again
                      </button>
                    </div>
                  ) : (
                    <CalibrationSampleTable
                      samples={poolSamples}
                      onRefresh={handlePoolRefresh}
                    />
                  )}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
