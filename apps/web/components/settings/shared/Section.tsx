// ─────────────────────────────────────────────────────────────────────────────
// components/settings/shared/Section.tsx
//
// Standard card shell used across every settings tab.
// Provides a consistent heading + description + content layout.
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  title:        string;
  description?: string;
  children:     React.ReactNode;
}

/**
 * Reusable bordered card used as the building block for each settings section.
 * All tabs should use this instead of rolling their own card wrapper.
 */
export function Section({ title, description, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111318]/80 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-white/40 leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
