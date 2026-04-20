"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MockExamShell — Top-level client shell for the full mock speaking exam.
//
// Responsibilities:
//  1. Fetch prompts via useMockExamPrompts on mount.
//  2. Init the exam store once prompts are ready.
//  3. Phase-route to the correct screen.
//  4. Render ExamProgressRail (always visible during active task phases).
//  5. Render exit button (always visible except UPLOADING/COMPLETE).
//
// Phase → Screen mapping:
//   IDLE / LOADING         → ExamLoadingScreen
//   READY                  → ExamIntroScreen
//   TASK_COUNTDOWN         → CountdownOverlay  (reused from speaking/)
//   TASK_PREP              → PrepTimerScreen   (reused from speaking/)
//   TASK_RECORDING         → RecordingInterface / Task5CurveballScreen
//   TASK_RECORDING_PART2   → RecordingInterface / Task5CurveballScreen
//   TASK_UPLOADING         → UploadProgressBar (reused from speaking/)
//   INTER_TASK_BREAK       → InterTaskBreakScreen
//   COMPLETE               → ExamCompleteScreen
//   ERROR                  → inline error panel
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect }          from "react";
import { XCircle }            from "lucide-react";
import { useQueryClient }     from "@tanstack/react-query";

import { useMockExamSession } from "@/lib/hooks/useMockExamSession";
import { useMockExamPrompts } from "@/lib/hooks/useMockExamPrompts";
import { useMockExamStore }   from "@/store/mockExamStore";

// Reused individual-task screens (no changes to these files)
import { CountdownOverlay }     from "@/components/speaking/CountdownOverlay";
import { PrepTimerScreen }      from "@/components/speaking/PrepTimerScreen";
import { RecordingInterface }   from "@/components/speaking/RecordingInterface";
import { Task5PartIndicator }   from "@/components/speaking/Task5PartIndicator";
import { Task5SelectionScreen } from "@/components/speaking/Task5SelectionScreen";
import { Task5CurveballScreen } from "@/components/speaking/Task5CurveballScreen";
import { UploadProgressBar }    from "@/components/speaking/UploadProgressBar";

// Exam-specific screens
import { ExamLoadingScreen }    from "@/components/exam/ExamLoadingScreen";
import { ExamIntroScreen }      from "@/components/exam/ExamIntroScreen";
import { ExamProgressRail }     from "@/components/exam/ExamProgressRail";
import { InterTaskBreakScreen } from "@/components/exam/InterTaskBreakScreen";
import { ExamCompleteScreen }   from "@/components/exam/ExamCompleteScreen";

// ── Component ─────────────────────────────────────────────────────────────────

export function MockExamShell() {
  const { prompts, isLoading: promptsLoading, error: promptsError } = useMockExamPrompts();

  const {
    phase,
    tasks,
    currentTask,
    currentTaskIndex,
    secondsLeft,
    breakSecondsLeft,
    uploadProgress,
    selectedChoice,
    uploadError,
    examSessionId,
    initExam,
    startExam,
    selectChoice,
    exit,
  } = useMockExamSession();

  const queryClient = useQueryClient();

  // On unmount: reset the store so re-entry always starts fresh.
  useEffect(() => {
    return () => {
      useMockExamStore.getState().reset();
    };
  }, []);

  // Once prompts arrive from React Query, populate the store.
  useEffect(() => {
    const currentPhase = useMockExamStore.getState().phase;
    if (
      !promptsLoading &&
      prompts.length > 0 &&
      (currentPhase === "IDLE" || currentPhase === "LOADING")
    ) {
      initExam(prompts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptsLoading, prompts.length]);

  // Invalidate the practiceQuota cache so the slot counter updates immediately
  // on the /practice/speaking page after the user finishes an exam.
  useEffect(() => {
    if (phase === "COMPLETE") {
      queryClient.invalidateQueries({ queryKey: ["practiceQuota"] });
    }
  }, [phase, queryClient]);

  const prompt = currentTask?.prompt ?? null;

  // ── Exit button visibility ────────────────────────────────────────────────
  const showExit =
    phase !== "TASK_UPLOADING" &&
    phase !== "COMPLETE" &&
    phase !== "IDLE" &&
    phase !== "LOADING";

  // ── Show ExamProgressRail only during active task / break phases ──────────
  const showRail =
    tasks.length > 0 &&
    phase !== "IDLE" &&
    phase !== "LOADING" &&
    phase !== "READY" &&
    phase !== "COMPLETE" &&
    phase !== "ERROR";

  // ── Phase router ──────────────────────────────────────────────────────────

  const renderScreen = () => {

    // Loading / fetching prompts
    if (phase === "IDLE" || phase === "LOADING" || promptsLoading) {
      return <ExamLoadingScreen />;
    }

    // Error fetching prompts (shown before exam init)
    if (promptsError && phase === "READY") {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-4 px-4 text-center">
          <XCircle className="w-12 h-12 text-red-400" />
          <p className="text-lg font-semibold text-foreground">Failed to load exam</p>
          <p className="text-sm text-subtle max-w-xs">{promptsError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      );
    }

    if (phase === "READY") {
      return <ExamIntroScreen onStart={startExam} />;
    }

    if (phase === "TASK_COUNTDOWN") {
      return <CountdownOverlay />;
    }

    if (phase === "TASK_PREP") {
      if (!prompt) return null;
      // Task 5: interactive two-choice selection screen
      if (prompt.task_number === 5 && prompt.choice_options?.length) {
        return (
          <Task5SelectionScreen
            secondsLeft={secondsLeft}
            totalPrepSeconds={prompt.prep_time_seconds}
            promptText={prompt.prompt_text}
            choiceOptions={prompt.choice_options}
            selectedChoice={selectedChoice}
            onSelect={selectChoice}
          />
        );
      }
      return (
        <PrepTimerScreen
          secondsLeft={secondsLeft}
          totalPrepSeconds={prompt.prep_time_seconds}
          promptText={prompt.prompt_text}
          imageUrl={prompt.context_image_url}
        />
      );
    }

    if (phase === "TASK_RECORDING") {
      if (!prompt) return null;
      // Task 5 RECORDING = silent curveball-prep phase
      if (prompt.task_number === 5 && prompt.curveball_option) {
        return (
          <Task5CurveballScreen
            secondsLeft={secondsLeft}
            totalSeconds={prompt.response_time_seconds}
            curveballOption={prompt.curveball_option}
            selectedChoice={selectedChoice}
            curveballInstructionText={prompt.curveball_instruction_text ?? ""}
            isRecording={false}
          />
        );
      }
      return (
        <div className="relative min-h-screen">
          <RecordingInterface
            secondsLeft={secondsLeft}
            totalResponseSeconds={prompt.response_time_seconds}
            partLabel={prompt.has_parts ? "Part 1 of 2" : undefined}
            imageUrl={prompt.context_image_url}
            promptText={prompt.prompt_text}
          />
          {prompt.has_parts && (
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <Task5PartIndicator currentPart={1} />
            </div>
          )}
        </div>
      );
    }

    if (phase === "TASK_RECORDING_PART2") {
      if (!prompt) return null;
      // Task 5 PART2 = curveball speaking phase (mic active)
      if (prompt.task_number === 5 && prompt.curveball_option) {
        return (
          <Task5CurveballScreen
            secondsLeft={secondsLeft}
            totalSeconds={prompt.response_time_seconds}
            curveballOption={prompt.curveball_option}
            selectedChoice={selectedChoice}
            curveballInstructionText={prompt.curveball_instruction_text ?? ""}
            isRecording={true}
          />
        );
      }
      return (
        <div className="relative min-h-screen">
          <RecordingInterface
            secondsLeft={secondsLeft}
            totalResponseSeconds={prompt.response_time_seconds}
            partLabel="Part 2 of 2"
          />
          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
            <Task5PartIndicator currentPart={2} />
          </div>
        </div>
      );
    }

    if (phase === "TASK_UPLOADING") {
      return <UploadProgressBar progress={uploadProgress} />;
    }

    if (phase === "INTER_TASK_BREAK") {
      const completedTask = tasks[currentTaskIndex];
      const nextTask      = tasks[currentTaskIndex + 1] ?? null;
      if (!completedTask) return null;
      return (
        <InterTaskBreakScreen
          completedTask={completedTask}
          nextTask={nextTask}
          breakSecondsLeft={breakSecondsLeft}
        />
      );
    }

    if (phase === "COMPLETE") {
      return <ExamCompleteScreen tasks={tasks} sessionId={examSessionId} />;
    }

    if (phase === "ERROR") {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-4 px-4 text-center">
          <XCircle className="w-12 h-12 text-red-400" />
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-subtle max-w-xs">
            {uploadError ?? "An unexpected error occurred during the exam."}
          </p>
          <button
            onClick={() => window.location.href = "/practice/speaking"}
            className="mt-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
          >
            Back to Practice
          </button>
        </div>
      );
    }

    return null;
  };

  // ── Padding offset for the progress rail ─────────────────────────────────
  const railOffset = showRail ? "pt-[52px]" : "";

  return (
    <div className={`relative ${railOffset}`}>
      {/* Fixed progress rail */}
      {showRail && (
        <ExamProgressRail
          tasks={tasks}
          currentTaskIndex={currentTaskIndex}
        />
      )}

      {/* Active screen */}
      {renderScreen()}

      {/* Exit button */}
      {showExit && (
        <button
          id="exam-exit-btn"
          onClick={exit}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-canvas-subtle hover:text-canvas-text text-sm font-medium
                     transition-all duration-150"
          aria-label="Exit exam session"
        >
          <XCircle className="w-4 h-4" />
          Exit
        </button>
      )}
    </div>
  );
}
