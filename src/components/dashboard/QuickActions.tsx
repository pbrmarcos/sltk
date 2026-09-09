import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type QuickAction = {
  label: string;
  to: string;
  icon: LucideIcon;
  color?: string;
};

export function QuickActions({
  actions,
  pendMap,
}: {
  actions: QuickAction[];
  pendMap?: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => {
        const pendCount = pendMap?.[a.to] ?? 0;
        const color = a.color ?? "var(--primary)";
        return (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="group relative flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2.5 py-1.5 transition-colors hover:border-[var(--text-muted)]/40 hover:bg-[var(--bg-elevated)]"
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform group-hover:scale-105"
              style={{ background: `${color}1A`, color }}
            >
              <a.icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                {a.label}
              </div>
            </div>
            {pendCount > 0 && (
              <span className="grid h-4 min-w-[16px] shrink-0 place-items-center rounded-full bg-[var(--danger,#ef4444)] px-1 text-[9.5px] font-bold tabular-nums text-white">
                {pendCount > 99 ? "99+" : pendCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
