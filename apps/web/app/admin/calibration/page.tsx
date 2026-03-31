// ─────────────────────────────────────────────────────────────────────────────
// app/admin/calibration/page.tsx — Calibration Sample Manager
//
// Admin page for managing reference scoring samples.
// Auth guard in app/admin/layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }              from "next";
import { Navbar }                     from "@/components/layout/Navbar";
import { Footer }                     from "@/components/layout/Footer";
import { AdminSidebar }               from "@/components/admin/AdminSidebar";
import { CalibrationSampleTable }     from "@/components/admin/CalibrationSampleTable";
import { MOCK_CALIBRATION_SAMPLES }   from "@/lib/mockData";

export const metadata: Metadata = {
  title:       "Calibration Samples — Admin",
  description: "Manage reference audio and writing samples used to calibrate AI band scoring.",
};

/**
 * Admin calibration page — /admin/calibration
 * Server component: feeds mock calibration samples to the client-side table.
 */
export default function AdminCalibrationPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <main className="flex-1 overflow-auto bg-muted px-6 py-8 max-w-6xl mx-auto w-full">
          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Calibration Samples</h1>
            <p className="text-sm text-subtle mt-1">
              Reference responses at known band levels. The AI scoring model uses these
              samples to calibrate its evaluations.
            </p>
          </div>

          <CalibrationSampleTable samples={MOCK_CALIBRATION_SAMPLES} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
