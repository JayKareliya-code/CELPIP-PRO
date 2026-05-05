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
import { cloneElement }       from "react";
import { XCircle }            from "lucide-react";
import { useQueryClient }     from "@tanstack/react-query";

import { useMockExamSession } from "@/lib/hooks/useMockExamSession";
import { useMockExamPrompts } from "@/lib/hooks/useMockExamPrompts";
import { getSpeakingTaskTitle } from "@/lib/speaking-constants";

// Reused individual-task screens (no changes to these files)
import { CountdownOverlay }     from "@/components/speaking/CountdownOverlay";
import { PrepTimerScreen }      from "@/components/speaking/PrepTimerScreen";
import { RecordingInterface }   from "@/components/speaking/RecordingInterface";
import { Task5SelectionScreen } from "@/components/speaking/Task5SelectionScreen";
import { Task5CurveballScreen } from "@/components/speaking/Task5CurveballScreen";
import { UploadProgressBar }    from "@/components/speaking/UploadProgressBar";

// Exam-specific screens
import { ExamLoadingScreen }    from "@/components/exam/ExamLoadingScreen";
import { ExamIntroScreen }      from "@/components/exam/ExamIntroScreen";
import { MockExamInfoBar }      from "@/components/exam/MockExamInfoBar";
import { InterTaskBreakScreen } from "@/components/exam/InterTaskBreakScreen";
import { ExamCompleteScreen }   from "@/components/exam/ExamCompleteScreen";

// ── Task titles — sourced from lib/speaking-constants (single source of truth) ──
// Do NOT declare a local TASK_TITLES map here; update speaking-constants.ts instead.

/**
 * Injects showInfoBar={false} into a JSX element.
 *
 * MockExamShell renders its own MockExamInfoBar at the top level, so all
 * child screens that accept showInfoBar MUST suppress their own internal bar.
 * Centralising this here means future screens added to renderScreen() are
 * automatically correct — no per-call-site discipline required.
 */
function withNoInfoBar(element: React.ReactElement): React.ReactElement {
  return cloneElement(element, { showInfoBar: false });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MockExamShellProps {
  /**
   * The exam slot number (1, 2, …) from the URL params.
   * Used to stabilise the session UUID so re-takes of the same slot
   * reuse the same session_id and don't inflate the progress counter.
   */
  slotNumber: number;
}

export function MockExamShell({ slotNumber }: MockExamShellProps) {
  const { prompts, isLoading: promptsLoading, error: promptsError } = useMockExamPrompts(slotNumber);

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
    terminate,
  } = useMockExamSession();

  const queryClient = useQueryClient();

  // On unmount: stop mic, reset the store so re-entry always starts fresh.
  useEffect(() => {
    return () => {
      terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once prompts arrive from React Query, populate the store.
  useEffect(() => {
    if (
      !promptsLoading &&
      prompts.length > 0 &&
      (phase === "IDLE" || phase === "LOADING")
    ) {
      initExam(prompts, slotNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptsLoading, prompts.length, phase]);

  // Invalidate the practiceQuota cache so the slot counter updates immediately
  // on the /practice/speaking page after the user finishes an exam.
  useEffect(() => {
    if (phase === "COMPLETE") {
      queryClient.invalidateQueries({ queryKey: ["practiceQuota"] });
    }
  }, [phase, queryClient]);

  const prompt = currentTask?.prompt ?? null;

  // ── Derive task title for the strip ────────────────────────────────────────
  const taskTitle = prompt
    ? getSpeakingTaskTitle(prompt.task_number)
    : "";

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

    // Error fetching prompts — must be checked FIRST, before the loading screen,
    // because phase stays "IDLE"/"LOADING" forever when the API call fails.
    if (promptsError && !promptsLoading) {
      const isComingSoon = promptsError instanceof Error &&
        "status" in promptsError &&
        (promptsError as Error & { status?: number }).status === 404;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-6 px-4 text-center">
          {isComingSoon ? (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
                <span className="text-3xl">🔒</span>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">Mock Exam {slotNumber} Coming Soon</p>
                <p className="text-sm text-subtle max-w-xs">
                  Questions for this exam are being prepared. Check back shortly.
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-red-400" />
              <p className="text-lg font-semibold text-foreground">Failed to load exam</p>
              <p className="text-sm text-subtle max-w-xs">{promptsError.message}</p>
            </>
          )}
          <button
            onClick={() => window.location.href = "/practice/speaking"}
            className="mt-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
          >
            Back to Practice
          </button>
        </div>
      );
    }

    // Loading / fetching prompts
    if (phase === "IDLE" || phase === "LOADING" || promptsLoading) {
      return <ExamLoadingScreen />;
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
        return withNoInfoBar(
          <Task5SelectionScreen
            secondsLeft={secondsLeft}
            totalPrepSeconds={prompt.prep_time_seconds}
            totalResponseSeconds={prompt.response_time_seconds}
            promptText={prompt.prompt_text}
            choiceOptions={prompt.choice_options}
            selectedChoice={selectedChoice}
            onSelect={selectChoice}
            taskNumber={prompt.task_number}
            taskTitle={taskTitle}
          />
        );
      }
      return withNoInfoBar(
        <PrepTimerScreen
          secondsLeft={secondsLeft}
          totalPrepSeconds={prompt.prep_time_seconds}
          totalResponseSeconds={prompt.response_time_seconds}
          promptText={prompt.prompt_text}
          imageUrl={prompt.context_image_url}
          taskNumber={prompt.task_number}
          taskTitle={taskTitle}
        />
      );
    }

    if (phase === "TASK_RECORDING") {
      if (!prompt) return null;
      // Task 5 RECORDING = silent curveball-prep phase
      if (prompt.task_number === 5 && prompt.curveball_option) {
        return withNoInfoBar(
          <Task5CurveballScreen
            secondsLeft={secondsLeft}
            totalSeconds={prompt.response_time_seconds}
            totalPrepSeconds={prompt.prep_time_seconds}
            curveballOption={prompt.curveball_option}
            selectedChoice={selectedChoice}
            curveballInstructionText={prompt.curveball_instruction_text ?? ""}
            isRecording={false}
            taskNumber={prompt.task_number}
            taskTitle={taskTitle}
          />
        );
      }
      return withNoInfoBar(
        <RecordingInterface
          secondsLeft={secondsLeft}
          totalResponseSeconds={prompt.response_time_seconds}
          totalPrepSeconds={prompt.prep_time_seconds}
          partLabel={prompt.has_parts ? "Part 1 of 2" : undefined}
          imageUrl={prompt.context_image_url}
          promptText={prompt.prompt_text}
          taskNumber={prompt.task_number}
          taskTitle={taskTitle}
        />
      );
    }

    if (phase === "TASK_RECORDING_PART2") {
      if (!prompt) return null;
      // Task 5 PART2 = curveball speaking phase (mic active)
      if (prompt.task_number === 5 && prompt.curveball_option) {
        return withNoInfoBar(
          <Task5CurveballScreen
            secondsLeft={secondsLeft}
            totalSeconds={prompt.response_time_seconds}
            totalPrepSeconds={prompt.prep_time_seconds}
            curveballOption={prompt.curveball_option}
            selectedChoice={selectedChoice}
            curveballInstructionText={prompt.curveball_instruction_text ?? ""}
            isRecording={true}
            taskNumber={prompt.task_number}
            taskTitle={taskTitle}
          />
        );
      }
      return withNoInfoBar(
        <RecordingInterface
          secondsLeft={secondsLeft}
          totalResponseSeconds={prompt.response_time_seconds}
          totalPrepSeconds={prompt.prep_time_seconds}
          partLabel="Part 2 of 2"
          promptText={prompt.prompt_text}
          taskNumber={prompt.task_number}
          taskTitle={taskTitle}
        />
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
        <div className="flex flex-col items-center justify-center flex-1 bg-canvas gap-4 px-4 text-center">
          <XCircle className="w-12 h-12 text-red-400" />
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-subtle max-w-xs">
            {uploadError ?? "An unexpected error occurred during the exam."}
          </p>
          <button
            onClick={() => window.location.href = "/practice/speaking"}
            className="mt-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
          >
            Back to Practice
          </button>
        </div>
      );
    }

    return null;
  };

  // Determine if MockExamInfoBar should render (only during active task/break)
  const showMockBar =
    tasks.length > 0 &&
    phase !== "IDLE" &&
    phase !== "LOADING" &&
    phase !== "READY" &&
    phase !== "COMPLETE" &&
    phase !== "ERROR";

  // Derive live bar props from current phase
  const barIsRecording =
    phase === "TASK_RECORDING" ||
    phase === "TASK_RECORDING_PART2";

  return (
    <div className="flex flex-col flex-1">

      {/* Unified task progress + info bar */}
      {showMockBar && prompt && (
        <MockExamInfoBar
          tasks={tasks}
          currentTaskIndex={currentTaskIndex}
          taskTitle={taskTitle}
          prepSeconds={prompt.prep_time_seconds}
          responseSeconds={prompt.response_time_seconds}
          isRecording={barIsRecording}
          secondsLeft={barIsRecording ? secondsLeft : undefined}
          partLabel={
            phase === "TASK_RECORDING" && prompt.has_parts ? "Part 1 of 2" :
            phase === "TASK_RECORDING_PART2" ? "Part 2 of 2" :
            undefined
          }
        />
      )}

      {/* Active screen.
           key={phase} intentionally causes a full subtree remount on every
           phase transition — resets child local state and triggers the
           animate-fade-in entry animation. Do NOT remove without verifying
           mic/audio state is safe to reuse across phase boundaries. */}
      <div key={phase} className="animate-fade-in flex flex-col flex-1">
        {renderScreen()}
      </div>

      {/* Exit button — z-[60] to sit above the canvas shell */}
      {showExit && (
        <button
          id="exam-exit-btn"
          onClick={exit}
          className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-white/[0.06] hover:bg-white/10 border border-border/40 hover:border-border
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
