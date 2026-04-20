import type { Metadata }  from "next";
import { notFound }       from "next/navigation";
import { Navbar }         from "@/components/layout/Navbar";
import { Footer }         from "@/components/layout/Footer";
import { AdminSidebar }   from "@/components/admin/AdminSidebar";
import { AdminWritingTaskDetail } from "@/components/admin/AdminWritingTaskDetail";
import { WRITING_TASK_META }      from "@/lib/admin/writingTaskMeta";

interface Props {
  params: Promise<{ task: string }>;
}

export function generateStaticParams() {
  return [1, 2].map((n) => ({ task: String(n) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { task } = await params;
  const taskNumber = Number(task) as 1 | 2;
  const meta = WRITING_TASK_META.find((m) => m.taskNumber === taskNumber);
  const name = meta?.name ?? `Task ${taskNumber}`;
  return {
    title:       `Writing ${name} — Admin`,
    description: `Manage writing prompts for ${name}.`,
  };
}

export default async function AdminWritingTaskPage({ params }: Props) {
  const { task } = await params;
  const taskNumber = Number(task) as 1 | 2;
  if (taskNumber !== 1 && taskNumber !== 2) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted px-4 py-6 w-full">
          <AdminWritingTaskDetail taskNumber={taskNumber} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
