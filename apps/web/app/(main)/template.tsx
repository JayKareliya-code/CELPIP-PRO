/**
 * (main)/template.tsx
 *
 * Next.js App Router "template" — unlike layout.tsx, this component
 * is REMOUNTED on every route change within the (main) group.
 * That means the `animate-fade-in` class triggers fresh on every navigation,
 * giving a smooth fade + subtle slide-up transition between pages.
 *
 * The animation is defined in tailwind.config.ts:
 *   "fade-in": { from: { opacity:0, translateY:8px }, to: { opacity:1, translateY:0 } }
 *   duration: 0.4s ease-out
 */

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
}
