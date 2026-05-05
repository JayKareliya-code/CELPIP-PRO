// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPracticeSession.tsx — Top-level session phase router
//
// Reads from useSpeakingAttempt, maps phase → screen component.
// All timer/upload/navigation logic lives in the hook — this file is pure UI.
//
// Exit flow:
//   The hook exposes exitRequested/cancelExit/confirmExit instead of
//   window.confirm(). This component renders a ConfirmModal when the user
//   taps an exit affordance, giving a proper in-app confirmation dialog that
//   works reliably on all browsers including iOS in-app WebViews.
//
// key={phase} strategy:
//   Intentionally causes a full subtree remount on every phase transition.
//   This resets local state in child screens (waveform, mic init) and triggers
//   the animate-fade-in CSS entry animation cleanly.
//   Trade-off: MicWaveform re-requests mic at RECORDING→RECORDING_PART2 for
//   Task 5. This is accepted — see useSpeakingAttempt for the full rationale.
//   Do NOT remove the key without verifying mic/audio state is safe to reuse.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect }              from "react";
import { useSpeakingAttempt }     from "@/lib/hooks/useSpeakingAttempt";
import { usePracticeSessionStore } from "@/store/practiceSessionStore";
import { CountdownOverlay }       from "@/components/speaking/CountdownOverlay";
import { PrepTimerScreen }        from "@/components/speaking/PrepTimerScreen";
import { RecordingInterface }     from "@/components/speaking/RecordingInterface";
import { Task5SelectionScreen }   from "@/components/speaking/Task5SelectionScreen";
import { Task5CurveballScreen }   from "@/components/speaking/Task5CurveballScreen";
import { UploadProgressBar }      from "@/components/speaking/UploadProgressBar";
import { ProcessingScreen }       from "@/components/common/ProcessingScreen";
import { ConfirmModal }           from "@/components/common/ConfirmModal";
import { getSpeakingTaskTitle }   from "@/lib/speaking-constants";
import type { SpeakingTask }      from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeakingPracticeSessionProps {
  task: SpeakingTask;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpeakingPracticeSession({ task }: SpeakingPracticeSessionProps) {
  const {
    phase, secondsLeft, uploadProgress, start, selectedChoice, terminate,
    exitRequested, cancelExit, confirmExit,
  } = useSpeakingAttempt();
  const { setSelectedChoice } = usePracticeSessionStore();

  // Start session on mount; terminate cleanly when the component unmounts
  // (covers browser back, Next.js navigation, or any parent re-key).
  // Using a single effect pairs start/terminate in the same lifecycle slot,
  // which is safe under React Strict Mode's double-invoke.
  useEffect(() => {
    start(task);
    return () => { terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taskTitle       = getSpeakingTaskTitle(task.task_number, task.title);
  const prepSeconds     = task.prep_time_seconds;
  const responseSeconds = task.response_time_seconds;

  // ── Phase → screen ────────────────────────────────────────────────────────

  const renderScreen = () => {
    switch (phase) {

      case "COUNTDOWN":
        return <CountdownOverlay />;

      case "PREP":
        if (task.task_number === 5 && task.choice_options?.length) {
          return (
            <Task5SelectionScreen
              secondsLeft={secondsLeft}
              totalPrepSeconds={prepSeconds}
              totalResponseSeconds={responseSeconds}
              promptText={task.prompt_text}
              choiceOptions={task.choice_options}
              selectedChoice={selectedChoice}
              onSelect={setSelectedChoice}
              taskNumber={task.task_number}
              taskTitle={taskTitle}
            />
          );
        }
        return (
          <PrepTimerScreen
            secondsLeft={secondsLeft}
            totalPrepSeconds={prepSeconds}
            totalResponseSeconds={responseSeconds}
            promptText={task.prompt_text}
            imageUrl={task.context_image_url}
            taskNumber={task.task_number}
            taskTitle={taskTitle}
          />
        );

      case "RECORDING":
        if (task.task_number === 5 && task.curveball_option) {
          return (
            <Task5CurveballScreen
              secondsLeft={secondsLeft}
              totalSeconds={responseSeconds}
              totalPrepSeconds={prepSeconds}
              curveballOption={task.curveball_option}
              selectedChoice={selectedChoice}
              curveballInstructionText={task.curveball_instruction_text ?? ""}
              isRecording={false}
              taskNumber={task.task_number}
              taskTitle={taskTitle}
            />
          );
        }
        return (
          <RecordingInterface
            secondsLeft={secondsLeft}
            totalResponseSeconds={responseSeconds}
            totalPrepSeconds={prepSeconds}
            partLabel={task.has_parts ? "Part 1 of 2" : undefined}
            imageUrl={task.context_image_url}
            promptText={task.prompt_text}
            taskNumber={task.task_number}
            taskTitle={taskTitle}
          />
        );

      case "RECORDING_PART2":
        if (task.task_number === 5 && task.curveball_option) {
          return (
            <Task5CurveballScreen
              secondsLeft={secondsLeft}
              totalSeconds={responseSeconds}
              totalPrepSeconds={prepSeconds}
              curveballOption={task.curveball_option}
              selectedChoice={selectedChoice}
              curveballInstructionText={task.curveball_instruction_text ?? ""}
              isRecording={true}
              taskNumber={task.task_number}
              taskTitle={taskTitle}
            />
          );
        }
        return (
          <RecordingInterface
            secondsLeft={secondsLeft}
            totalResponseSeconds={responseSeconds}
            totalPrepSeconds={prepSeconds}
            partLabel="Part 2 of 2"
            promptText={task.prompt_text}
            taskNumber={task.task_number}
            taskTitle={taskTitle}
          />
        );

      case "UPLOADING":
        return <UploadProgressBar progress={uploadProgress} />;

      case "PROCESSING":
        return <ProcessingScreen skill="speaking" />;

      default:
        // IDLE / DONE — hook navigates away
        return (
          <div className="flex items-center justify-center flex-1 bg-canvas">
            <span className="text-white/30 text-sm">Loading…</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1" key={phase}>
      <div className="animate-fade-in flex flex-col flex-1">
        {renderScreen()}
      </div>

      {/* Exit confirmation modal — rendered outside the phase-keyed tree so it
          survives phase transitions and is never accidentally unmounted mid-dialog. */}
      <ConfirmModal
        open={exitRequested}
        onCancel={cancelExit}
        onConfirm={confirmExit}
        title="Leave practice session?"
        description="Your recording will not be saved. This action cannot be undone."
        confirmLabel="Leave session"
        isDestructive
      />
    </div>
  );
}
