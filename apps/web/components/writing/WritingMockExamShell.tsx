"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingMockExamShell — Top-level client shell for the full writing mock exam.
//
// Responsibilities:
//  1. Fetch mock prompts via React Query (/writing/mock-prompts).
//  2. Phase-route to the correct screen.
//  3. Invalidate practiceQuota cache on COMPLETE.
//
// Phase → Screen mapping:
//   LOADING   → loading spinner
//   READY     → WritingExamIntroScreen
//   TASK_1    → WritingTaskRunner  (task 1)
//   BREAK     → WritingExamBreakScreen
//   TASK_2    → WritingTaskRunner  (task 2)
//   COMPLETE  → WritingExamCompleteScreen
//   ERROR     → inline error panel
//
// Exit flow:
//   The exit button (WritingMockExamExitGuard) is rendered OUTSIDE this
//   component in page.tsx. It owns its own ConfirmModal — no CustomEvent
//   bridge needed. When confirmed it calls router.push("/practice/writing").
//   onExit() on WritingTaskRunner is kept as an internal escape hatch for
//   task-level exits triggered from within the runner itself.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useRouter }         from "next/navigation";
import { useAuth }           from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle }  from "lucide-react";

import {
  WritingTaskRunner,
  WritingExamIntroScreen,
  WritingExamBreakScreen,
  WritingExamCompleteScreen,
} from "@/components/writing-exam";

import { API_BASE_URL, API_V1, authHeaders } from "@/lib/api";
import type { WritingTask }    from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExamPhase = "LOADING" | "READY" | "TASK_1" | "BREAK" | "TASK_2" | "COMPLETE" | "ERROR";

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchWritingMockPrompts(token: string | null, slot: number): Promise<WritingTask[]> {
  const res = await fetch(`${API_BASE_URL}${API_V1}/writing/mock-prompts?slot=${slot}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().then((j) => j?.detail ?? "").catch(() => "");
    const err = new Error(detail || `Failed to load writing mock prompts (${res.status})`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingMockExamShell({ examNumber }: { examNumber: number }) {
  const { getToken }  = useAuth();
  const router        = useRouter();
  const queryClient   = useQueryClient();

  const [phase,      setPhase]      = useState<ExamPhase>("LOADING");
  const [task1,      setTask1]      = useState<WritingTask | null>(null);
  const [task2,      setTask2]      = useState<WritingTask | null>(null);
  const [attempt1Id, setAttempt1Id] = useState<string | null>(null);
  const [attempt2Id, setAttempt2Id] = useState<string | null>(null);
  const [errMsg,     setErrMsg]     = useState<string | null>(null);

  // ── Fetch mock prompts ────────────────────────────────────────────────────

  const { data: prompts, isLoading, error: fetchError } = useQuery<WritingTask[]>({
    queryKey: ["writingMockPrompts", examNumber],
    queryFn: async () => {
      const token = await getToken();
      return fetchWritingMockPrompts(token, examNumber);
    },
    staleTime: 0,
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) return;
    if (fetchError) {
      const isComingSoon =
        (fetchError as Error & { status?: number }).status === 404 ||
        fetchError.message.includes("not available yet");
      setErrMsg(
        isComingSoon
          ? `__coming_soon__`  // sentinel — rendered differently below
          : fetchError.message,
      );
      setPhase("ERROR");
      return;
    }
    if (!prompts || prompts.length < 2) {
      setErrMsg("__coming_soon__");
      setPhase("ERROR");
      return;
    }
    const sorted = [...prompts].sort((a, b) => a.task_number - b.task_number);
    setTask1(sorted.find((t) => t.task_number === 1) ?? sorted[0]);
    setTask2(sorted.find((t) => t.task_number === 2) ?? sorted[1]);
    setPhase("READY");
  }, [isLoading, prompts, fetchError]);

  // ── Invalidate quota on COMPLETE ─────────────────────────────────────────

  useEffect(() => {
    if (phase === "COMPLETE") {
      queryClient.invalidateQueries({ queryKey: ["practiceQuota"] });
    }
  }, [phase, queryClient]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTask1Complete = useCallback((attemptId: string) => {
    setAttempt1Id(attemptId);
    setPhase("BREAK");
  }, []);

  const handleTask2Complete = useCallback((attemptId: string) => {
    setAttempt2Id(attemptId);
    setPhase("COMPLETE");
  }, []);

  const handleExit = useCallback(() => {
    router.push("/mock-test/writing");
  }, [router]);

  // P1-3: memoized so WritingExamBreakScreen's useEffect([secs, onContinue])
  // doesn't clear-and-restart its timer on every parent re-render.
  const handleBreakContinue = useCallback(() => setPhase("TASK_2"), []);

  // ── Phase router ─────────────────────────────────────────────────────────

  if (phase === "LOADING" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (phase === "ERROR") {
    const isComingSoon = errMsg === "__coming_soon__";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-6 px-4 text-center">
        {isComingSoon ? (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
              <span className="text-3xl">🔒</span>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-canvas-text">
                Writing Mock Exam {examNumber} Coming Soon
              </p>
              <p className="text-sm text-canvas-subtle max-w-xs">
                Questions for this exam are being prepared. Check back shortly.
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-lg font-semibold text-foreground">Could not load exam</p>
            <p className="text-sm text-subtle max-w-xs">{errMsg}</p>
          </>
        )}
        <button
          onClick={() => router.push("/mock-test/writing")}
          className="mt-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold"
        >
          Back to Mock Tests
        </button>
      </div>
    );
  }

  if (phase === "READY" && task1 && task2) {
    return (
      <WritingExamIntroScreen
        task1={task1}
        task2={task2}
        onStart={() => setPhase("TASK_1")}
      />
    );
  }

  if (phase === "TASK_1" && task1) {
    return (
      <WritingTaskRunner
        task={task1}
        examNumber={examNumber}
        onComplete={handleTask1Complete}
        onExit={handleExit}
      />
    );
  }

  if (phase === "BREAK") {
    return <WritingExamBreakScreen onContinue={handleBreakContinue} />;
  }

  if (phase === "TASK_2" && task2) {
    return (
      <WritingTaskRunner
        task={task2}
        examNumber={examNumber}
        onComplete={handleTask2Complete}
        onExit={handleExit}
      />
    );
  }

  if (phase === "COMPLETE") {
    // P1-2: both IDs must be set before rendering results.
    // In practice this is always true because COMPLETE is only entered via
    // handleTask2Complete — guard anyway to avoid a silent white-screen.
    if (!attempt1Id || !attempt2Id) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-canvas">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      );
    }
    return (
      <WritingExamCompleteScreen
        attempt1Id={attempt1Id}
        attempt2Id={attempt2Id}
      />
    );
  }

  // All known phases are handled above. This path is only hit transiently
  // during READY when task1/task2 are still null — render nothing, not null.
  return null;
}
