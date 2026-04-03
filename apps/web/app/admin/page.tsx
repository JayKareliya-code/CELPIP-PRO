// app/admin/page.tsx — Admin home overview
// Auth guard is in app/admin/layout.tsx — no redirect needed here.

import type { Metadata } from "next";
import Link from "next/link";
import { BookCopy, Sliders, Mic, PenLine, ArrowRight, BookOpen, Image, Tag, ClipboardList } from "lucide-react";
import { Navbar }       from "@/components/layout/Navbar";
import { Footer }       from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ROUTES }       from "@/lib/constants";
import { MOCK_CALIBRATION_SAMPLES } from "@/lib/mockData";
import { MOCK_SPEAKING_PROMPTS, MOCK_WRITING_PROMPTS } from "@/lib/mockAdminData";

export const metadata: Metadata = {
  title: "Admin — CELPIP PRO",
  description: "Platform administration dashboard.",
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-card p-5 flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-subtle font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, title, description, icon: Icon }: {
  href: string; title: string; description: string; icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 bg-surface rounded-xl
                 border border-border shadow-card p-5 hover:border-primary/40
                 hover:shadow-focus transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
          <Icon className="w-4 h-4 text-subtle group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-subtle mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-subtle group-hover:text-primary transition-colors shrink-0 mt-1" />
    </Link>
  );
}

export default function AdminHomePage() {
  const totalSpeaking  = MOCK_SPEAKING_PROMPTS.length;
  const totalWriting   = MOCK_WRITING_PROMPTS.length;
  const totalCal       = MOCK_CALIBRATION_SAMPLES.length;
  const activeSpeaking = MOCK_SPEAKING_PROMPTS.filter((p) => p.is_active).length;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted px-6 py-8 space-y-8 max-w-5xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Overview</h1>
            <p className="text-sm text-subtle mt-1">Platform statistics and quick access to management tools.</p>
          </div>

          {/* Stats */}
          <section aria-label="Platform statistics">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">Statistics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Speaking Prompts"        value={totalSpeaking}  icon={Mic}      />
              <StatCard label="Writing Prompts"         value={totalWriting}   icon={PenLine}  />
              <StatCard label="Calibration Samples"     value={totalCal}       icon={Sliders}  />
              <StatCard label="Active Speaking Prompts" value={activeSpeaking} icon={BookCopy} />
            </div>
          </section>

          {/* Quick links */}
          <section aria-label="Admin navigation">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickLink href={ROUTES.adminPrompts}     icon={BookCopy}    title="Prompts"            description="Create and manage speaking & writing prompts with draft/publish/archive workflow." />
              <QuickLink href={ROUTES.adminMaterials}   icon={BookOpen}    title="Learning Materials" description="Add articles, tip sheets, sample responses, templates, and vocabulary sets." />
              <QuickLink href={ROUTES.adminAssets}      icon={Image}       title="Assets"             description="Upload and manage images, PDFs, audio, and other media files." />
              <QuickLink href={ROUTES.adminTags}        icon={Tag}         title="Tags"               description="Create and manage reusable content tags by topic, grammar, vocabulary, etc." />
              <QuickLink href={ROUTES.adminCalibration} icon={Sliders}     title="Calibration"        description="Manage reference samples used to calibrate AI scoring models." />
              <QuickLink href={ROUTES.adminAudit}       icon={ClipboardList} title="Audit Log"        description="Track every admin content change with timestamps and before/after snapshots." />
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
