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
    <div className="relative rounded-2xl border border-white/[0.09] bg-surface overflow-hidden">
      {/* Subtle amber top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-white/45 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.07]" />

      {/* Content */}
      <div className="px-6 py-5 space-y-5">
        {children}
      </div>
    </div>
  );
}
