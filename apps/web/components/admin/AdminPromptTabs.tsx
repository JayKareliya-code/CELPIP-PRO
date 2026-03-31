// ─────────────────────────────────────────────────────────────────────────────
// AdminPromptTabs.tsx — shadcn/ui Tabs: Speaking | Writing prompt tables
//
// Client component — needs "use client" because Tabs state is interactive.
// Receives prompt arrays as props (fed from server component page.tsx).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpeakingPromptTable }                      from "@/components/admin/SpeakingPromptTable";
import { WritingPromptTable }                       from "@/components/admin/WritingPromptTable";
import type { SpeakingPrompt, WritingPrompt }       from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminPromptTabsProps {
  speakingPrompts: SpeakingPrompt[];
  writingPrompts:  WritingPrompt[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Tabbed view for Speaking / Writing prompt management.
 * Each tab renders the corresponding data table with add/edit/delete actions.
 */
export function AdminPromptTabs({
  speakingPrompts,
  writingPrompts,
}: AdminPromptTabsProps) {
  return (
    <Tabs defaultValue="speaking" className="w-full">
      <TabsList className="mb-6 bg-surface border border-border shadow-card">
        <TabsTrigger
          id="prompts-tab-speaking"
          value="speaking"
          className="data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          Speaking
        </TabsTrigger>
        <TabsTrigger
          id="prompts-tab-writing"
          value="writing"
          className="data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          Writing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="speaking">
        <SpeakingPromptTable prompts={speakingPrompts} />
      </TabsContent>

      <TabsContent value="writing">
        <WritingPromptTable prompts={writingPrompts} />
      </TabsContent>
    </Tabs>
  );
}
