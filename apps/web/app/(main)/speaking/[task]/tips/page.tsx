import { notFound } from "next/navigation";
import Link         from "next/link";
import { auth }     from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageWrapper }         from "@/components/layout/PageWrapper";
import { BreadcrumbNav }       from "@/components/layout/BreadcrumbNav";
import { TipsTabPanel }        from "@/components/speaking/TipsTabPanel";
import { TaskMetaBadges }      from "@/components/speaking/TaskMetaBadges";
import { StartPracticeButton } from "@/components/speaking/StartPracticeButton";
import type { SpeakingTask }   from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps { params: { task: string } }

// ── Data fetch ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchTask(taskId: string, token: string | null): Promise<SpeakingTask | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/speaking/tasks/by-id/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Speaking Tips — CELPIP Prep",
    description: "Key vocabulary, connector phrases, and structural response templates. Study before your timed CELPIP speaking practice.",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SpeakingTipsPage({ params }: PageProps) {
  const { getToken } = await auth();
  const token = await getToken();
  const task = await fetchTask(params.task, token);
  if (!task) notFound();

  const taskLabel =
    task.task_number === 0 ? "Practice Task" : `Task ${task.task_number}`;

  const hasTips =
    (task.vocabulary_tips   && task.vocabulary_tips.length > 0)  ||
    (task.connector_phrases && task.connector_phrases.length > 0) ||
    !!task.template_hint;

  return (
    <PageWrapper>
      <BreadcrumbNav />

      <div className="mt-4 mb-1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href={`/speaking/${task.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-subtle
                       hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to instruction
          </Link>

          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            {task.title}
          </h1>
          <p className="text-sm text-subtle mt-1">
            {taskLabel} — Vocabulary, Connectors &amp; Response Template
          </p>
        </div>

        <TaskMetaBadges
          prepTimeSecs={task.prep_time_seconds}
          responseTimeSecs={task.response_time_seconds}
          hasParts={task.has_parts}
        />
      </div>

      {hasTips ? (
        <div className="mt-6">
          <TipsTabPanel
            vocabularyTips={task.vocabulary_tips    ?? []}
            connectorPhrases={task.connector_phrases ?? []}
            templateHint={task.template_hint         ?? ""}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-subtle text-sm">No tips available for this task yet.</p>
        </div>
      )}

      <div className="mt-8">
        <StartPracticeButton taskId={task.id} />
      </div>
    </PageWrapper>
  );
}
