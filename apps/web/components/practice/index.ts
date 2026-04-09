// ─────────────────────────────────────────────────────────────────────────────
// components/practice/index.ts — barrel export
//
// Import practice components from "@/components/practice" rather than
// from deep file paths. Keeps consumer imports clean and decoupled from
// the internal file layout.
// ─────────────────────────────────────────────────────────────────────────────

export { PracticeHub }        from "@/components/practice/PracticeHub";
export { PracticeTestList }   from "@/components/practice/PracticeTestList";
export { PracticeSkillCard }  from "@/components/practice/PracticeSkillCard";
export { PracticeTestSlot }   from "@/components/practice/PracticeTestSlot";
export { PracticeQuotaRing }  from "@/components/practice/PracticeQuotaRing";
export { PracticeQuotaBar }   from "@/components/practice/PracticeQuotaBar";
export { PracticeUpgradeCTA } from "@/components/practice/PracticeUpgradeCTA";
