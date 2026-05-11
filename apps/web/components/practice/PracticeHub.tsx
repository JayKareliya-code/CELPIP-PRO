"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeHub — /practice landing page.
//
// Layout mirrors SpeakingModuleHome / WritingModuleHome exactly:
//   • Icon header + module title
//   • Upgrade banner (starter)
//   • Stats strip (non-starter)
//   • 2-col grid of PracticeSkillCards
// ─────────────────────────────────────────────────────────────────────────────

import { PlayCircle, ArrowRight, BookOpen } from "lucide-react";
import Link                       from "next/link";
import { BreadcrumbNav }          from "@/components/layout/BreadcrumbNav";
import { PracticeSkillCard }      from "@/components/practice/PracticeSkillCard";
import { usePracticeQuota }       from "@/lib/hooks/usePracticeQuota";
import { useCurrentUser }         from "@/lib/hooks/useCurrentUser";
import {
  PRO_PLAN_LIMITS,
} from "@/lib/constants";
import type { AppUser } from "@/lib/types";

const SKILLS = ["speaking", "writing"] as const;

interface PracticeHubProps {
  user: AppUser | null;
}

export function PracticeHub({ user: serverUser }: PracticeHubProps) {
  const { user: clientUser } = useCurrentUser();
  const user      = clientUser ?? serverUser;
  const plan      = user?.plan ?? "starter";
  const isStarter = plan === "starter";

  const { quota: speakingQuota, isLoading: loadingS } = usePracticeQuota("speaking");
  const { quota: writingQuota,  isLoading: loadingW } = usePracticeQuota("writing");

  const isLoading = loadingS || loadingW;
  const planLabel = plan === "pro" ? "Pro Plan" : "Starter Plan";

  // Total tests available across both skills
  const totalSpeaking = plan === "pro" ? PRO_PLAN_LIMITS.speaking_mock_tests : 1;
  const totalWriting  = plan === "pro" ? PRO_PLAN_LIMITS.writing_mock_tests  : 1;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <PlayCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mock Tests</h1>
            <p className="text-sm text-subtle mt-0.5">
              Full-length timed mock exams · Speaking &amp; Writing · AI scored
            </p>
          </div>
        </div>
      </div>

      {/* ── Starter upgrade banner ─────────────────────────────────────────── */}
      {isStarter && (
        <div className="relative overflow-hidden rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/60 via-amber-950/40 to-yellow-950/40 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200">
              Unlock more mock tests
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Starter plan includes 1 mock test per skill. Upgrade to Pro
              for more full-length timed exams with AI scoring.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          >
            Upgrade
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      {!isStarter && !isLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            { label: "Skills",           value: "2",                           sub: "Speaking & Writing" },
            { label: "Speaking tests",   value: String(totalSpeaking),         sub: `Included in ${plan}`  },
            { label: "Writing tests",    value: String(totalWriting),          sub: `Included in ${plan}`  },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3"
            >
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs font-medium text-subtle">{label}</p>
              <p className="text-[0.65rem] text-white/25 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Skill cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SKILLS.map((skill) => {
          const quota   = skill === "speaking" ? speakingQuota : writingQuota;
          const loading = skill === "speaking" ? loadingS : loadingW;

          if (loading || !quota) {
            return (
              <div
                key={skill}
                className="rounded-xl border border-white/[0.06] bg-surface h-[190px] animate-pulse"
              />
            );
          }

          return (
            <PracticeSkillCard
              key={skill}
              skill={skill}
              quota={quota}
              planLabel={planLabel}
              isLocked={false}
            />
          );
        })}
      </div>
    </div>
  );
}
