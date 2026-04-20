// ─────────────────────────────────────────────────────────────────────────────
// layout.tsx — Session layout for /speaking/[task]/practice
// ─────────────────────────────────────────────────────────────────────────────

import { BackButton } from "@/components/speaking/BackButton";

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-canvas">{children}</div>
      <BackButton />
    </>
  );
}
