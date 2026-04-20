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

import { API_V1, authHeaders } from "@/lib/api";
import type { WritingTask }    from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExamPhase = "LOADING" | "READY" | "TASK_1" | "BREAK" | "TASK_2" | "COMPLETE" | "ERROR";

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchWritingMockPrompts(token: string | null): Promise<WritingTask[]> {
  const res = await fetch(`${API_BASE}${API_V1}/writing/mock-prompts`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load writing mock prompts (${res.status})`);
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
    queryKey: ["writingMockPrompts"],
    queryFn: async () => {
      const token = await getToken();
      return fetchWritingMockPrompts(token);
    },
    staleTime: 0,
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) return;
    if (fetchError) {
      setErrMsg(fetchError.message);
      setPhase("ERROR");
      return;
    }
    if (!prompts || prompts.length < 2) {
      setErrMsg("Writing mock prompts are not available yet. Please check back soon.");
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
    router.push("/practice/writing");
  }, [router]);

  // ── Phase router ─────────────────────────────────────────────────────────

  if (phase === "LOADING" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (phase === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-4 px-4 text-center">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Could not load exam</p>
        <p className="text-sm text-subtle max-w-xs">{errMsg}</p>
        <button
          onClick={() => router.push("/practice/writing")}
          className="mt-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
        >
          Back to Practice
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
    return <WritingExamBreakScreen onContinue={() => setPhase("TASK_2")} />;
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

  if (phase === "COMPLETE" && attempt1Id && attempt2Id) {
    return (
      <WritingExamCompleteScreen
        attempt1Id={attempt1Id}
        attempt2Id={attempt2Id}
      />
    );
  }

  return null;
}
