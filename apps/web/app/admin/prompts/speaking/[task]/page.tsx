import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import { Navbar }        from "@/components/layout/Navbar";
import { Footer }        from "@/components/layout/Footer";
import { AdminSidebar }  from "@/components/admin/AdminSidebar";
import { AdminSpeakingTaskDetail } from "@/components/admin/AdminSpeakingTaskDetail";
import { SPEAKING_TASK_NAMES }     from "@/lib/constants";

interface Props {
  params: { task: string };
}

export function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ task: String(n) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const taskNumber = Number(params.task);
  const name       = SPEAKING_TASK_NAMES[`task-${taskNumber}`] ?? `Task ${taskNumber}`;
  return {
    title:       `${name} — Admin`,
    description: `Manage speaking prompts for ${name}.`,
  };
}

export default function AdminSpeakingTaskPage({ params }: Props) {
  const taskNumber = Number(params.task);
  if (!Number.isInteger(taskNumber) || taskNumber < 1 || taskNumber > 8) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted px-4 py-6 w-full">
          <AdminSpeakingTaskDetail taskNumber={taskNumber} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
