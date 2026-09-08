import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type QuickAction = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export function QuickActions({
  actions,
  pendMap,
}: {
  actions: QuickAction[];
  pendMap?: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const pendCount = pendMap?.[a.to] ?? 0;
        return (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="relative inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--bg-elevated)]"
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
            {pendCount > 0 && (
              <span className="grid shrink-0 min-w-[16px] h-[16px] px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold tabular-nums text-white ring-1 ring-red-400/60">
                {pendCount > 99 ? "99+" : pendCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
