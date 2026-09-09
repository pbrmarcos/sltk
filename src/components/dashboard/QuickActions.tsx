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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {actions.map((a) => {
        const pendCount = pendMap?.[a.to] ?? 0;
        const color = a.color ?? "var(--primary)";
        return (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="group relative flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 transition-colors hover:border-[var(--text-muted)]/40 hover:bg-[var(--bg-elevated)]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform group-hover:scale-105"
              style={{ background: `${color}1A`, color }}
            >
              <a.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">
                {a.label}
              </div>
              {pendCount > 0 && (
                <div className="text-[11px] tabular-nums text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--danger,#ef4444)]">
                    {pendCount > 99 ? "99+" : pendCount}
                  </span>{" "}
                  pendente{pendCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
