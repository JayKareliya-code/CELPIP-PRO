// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPracticeSession.tsx — Top-level session shell
//
// This is the only component that reads from useSpeakingAttempt.
// It acts as a phase-router: based on `phase`, it renders exactly ONE
// child screen and nothing else (no navbar/sidebar — full-screen dark mode).
//
// Phase → Component mapping:
//   IDLE            → null (should not occur; page auto-calls start())
//   COUNTDOWN       → CountdownOverlay
//   PREP            → PrepTimerScreen
//   RECORDING       → RecordingInterface  (+ Task5PartIndicator if has_parts)
//   RECORDING_PART2 → RecordingInterface  (Part 2, Task 5)
//   UPLOADING       → UploadProgressBar
//   PROCESSING      → ProcessingScreen
//   DONE            → (hook navigates away — renders nothing)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";
import { XCircle }   from "lucide-react";

import { useSpeakingAttempt } from "@/lib/hooks/useSpeakingAttempt";
import { CountdownOverlay }   from "@/components/speaking/CountdownOverlay";
import { PrepTimerScreen }    from "@/components/speaking/PrepTimerScreen";
import { RecordingInterface } from "@/components/speaking/RecordingInterface";
import { Task5PartIndicator } from "@/components/speaking/Task5PartIndicator";
import { Task5SelectionScreen }  from "@/components/speaking/Task5SelectionScreen";
import { Task5CurveballScreen }  from "@/components/speaking/Task5CurveballScreen";
import { UploadProgressBar }  from "@/components/speaking/UploadProgressBar";
import { ProcessingScreen }   from "@/components/common/ProcessingScreen";
import type { SpeakingTask }  from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeakingPracticeSessionProps {
  /** The full task object — passed in from the page (server component). */
  task: SpeakingTask;
}

/**
 * Top-level speaking practice session shell.
 *
 * Responsibilities:
 *   1. Call `start(task)` once on mount via useEffect.
 *   2. Render the appropriate screen for the current phase.
 *   3. Render the exit button (always visible except during UPLOADING/PROCESSING).
 *
 * All timer, upload, and navigation logic lives in useSpeakingAttempt.
 */
export function SpeakingPracticeSession({ task }: SpeakingPracticeSessionProps) {
  const { phase, secondsLeft, uploadProgress, start, exit, selectedChoice } = useSpeakingAttempt();

  // Auto-start on mount
  useEffect(() => {
    start(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exit button visibility ─────────────────────────────────────────────────
  const canExit = phase !== "UPLOADING" && phase !== "PROCESSING" && phase !== "DONE";

  // ── Phase → screen ────────────────────────────────────────────────────────

  const renderScreen = () => {
    switch (phase) {
      case "COUNTDOWN":
        return <CountdownOverlay />;

      case "PREP":
        // Task 5: interactive two-choice selection screen
        if (task.task_number === 5 && task.choice_options?.length) {
          return (
            <Task5SelectionScreen
              secondsLeft={secondsLeft}
              totalPrepSeconds={task.prep_time_seconds}
              promptText={task.prompt_text}
              choiceOptions={task.choice_options}
            />
          );
        }
        // All other tasks: standard timer + prompt card
        return (
          <PrepTimerScreen
            secondsLeft={secondsLeft}
            totalPrepSeconds={task.prep_time_seconds}
            promptText={task.prompt_text}
            imageUrl={task.context_image_url}
          />
        );

      case "RECORDING":
        // Task 5: RECORDING = curveball PREP phase (no mic, just timer + curveball reveal)
        if (task.task_number === 5 && task.curveball_option) {
          return (
            <Task5CurveballScreen
              secondsLeft={secondsLeft}
              totalSeconds={task.response_time_seconds}
              curveballOption={task.curveball_option}
              selectedChoice={selectedChoice}
              curveballInstructionText={task.curveball_instruction_text ?? ""}
              isRecording={false}
            />
          );
        }
        // All other tasks: normal Part 1 recording
        return (
          <div className="relative min-h-screen">
            <RecordingInterface
              secondsLeft={secondsLeft}
              totalResponseSeconds={task.response_time_seconds}
              partLabel={task.has_parts ? "Part 1 of 2" : undefined}
              imageUrl={task.context_image_url}
              promptText={task.prompt_text}
            />
            {task.has_parts && (
              <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                <Task5PartIndicator currentPart={1} />
              </div>
            )}
          </div>
        );

      case "RECORDING_PART2":
        // Task 5: RECORDING_PART2 = curveball SPEAKING phase (mic active)
        if (task.task_number === 5 && task.curveball_option) {
          return (
            <Task5CurveballScreen
              secondsLeft={secondsLeft}
              totalSeconds={task.response_time_seconds}
              curveballOption={task.curveball_option}
              selectedChoice={selectedChoice}
              curveballInstructionText={task.curveball_instruction_text ?? ""}
              isRecording={true}
            />
          );
        }
        // All other has_parts tasks: normal Part 2 recording
        return (
          <div className="relative min-h-screen">
            <RecordingInterface
              secondsLeft={secondsLeft}
              totalResponseSeconds={task.response_time_seconds}
              partLabel="Part 2 of 2"
            />
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <Task5PartIndicator currentPart={2} />
            </div>
          </div>
        );

      case "UPLOADING":
        return <UploadProgressBar progress={uploadProgress} />;

      case "PROCESSING":
        return <ProcessingScreen skill="speaking" />;

      default:
        // IDLE or DONE — hook is navigating away
        return (
          <div className="flex items-center justify-center min-h-screen bg-canvas">
            <span className="text-canvas-subtle">Loading…</span>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Active screen */}
      {renderScreen()}

      {/* Exit button — top-right corner */}
      {canExit && (
        <button
          onClick={exit}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-canvas-subtle hover:text-canvas-text text-sm font-medium
                     transition-all duration-150"
          aria-label="Exit practice session"
        >
          <XCircle className="w-4 h-4" />
          Exit
        </button>
      )}
    </div>
  );
}
