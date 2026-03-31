// ─────────────────────────────────────────────────────────────────────────────
// app/admin/prompts/page.tsx — Prompt Management admin page
//
// Two tabs: Speaking | Writing.
// Each tab renders the corresponding data table + Add Prompt button.
// Auth guard in app/admin/layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }           from "next";
import { Navbar }                  from "@/components/layout/Navbar";
import { Footer }                  from "@/components/layout/Footer";
import { AdminSidebar }            from "@/components/admin/AdminSidebar";
import { AdminPromptTabs }         from "@/components/admin/AdminPromptTabs";
import { MOCK_SPEAKING_PROMPTS, MOCK_WRITING_PROMPTS } from "@/lib/mockAdminData";

export const metadata: Metadata = {
  title:       "Prompt Management — Admin",
  description: "Create, edit, and manage speaking and writing prompts across all CELPIP task types.",
};

/**
 * Admin prompt management page — /admin/prompts
 * Feeds mock prompt data to the tabbed client-side table components.
 * Day 10 (future): replace mock data with async API fetch.
 */
export default function AdminPromptsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <main className="flex-1 overflow-auto bg-muted px-6 py-8 max-w-6xl mx-auto w-full">
          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Prompt Management</h1>
            <p className="text-sm text-subtle mt-1">
              Create, edit, and activate prompts shown to candidates during practice sessions.
            </p>
          </div>

          {/* Tabbed tables — client component */}
          <AdminPromptTabs
            speakingPrompts={MOCK_SPEAKING_PROMPTS}
            writingPrompts={MOCK_WRITING_PROMPTS}
          />
        </main>
      </div>

      <Footer />
    </div>
  );
}
