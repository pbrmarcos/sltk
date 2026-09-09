import { QuickActions, type QuickAction } from "./QuickActions";

export function ShortcutsPanel({
  actions,
  pendMap,
}: {
  actions: QuickAction[];
  pendMap?: Record<string, number>;
}) {
  if (!actions.length) return null;
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2.5">
      <QuickActions actions={actions} pendMap={pendMap} />
    </section>
  );
}
